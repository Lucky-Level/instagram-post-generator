import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import type { ProviderConfig, ImageProvider } from "@/lib/provider-config";

export const maxDuration = 60;

const NO_TEXT_SUFFIX =
  " CRITICAL: Do NOT include any text, titles, subtitles, logos, watermarks, " +
  "typography, captions, labels, or UI overlays of any kind in the image. " +
  "Clean visual background only. No words, no letters.";

// ---------------------------------------------------------------------------
// Provider functions (copied from create.ts, parameterized with API keys)
// ---------------------------------------------------------------------------

async function tryGemini(
  prompt: string,
  referenceImages: string[] | undefined,
  apiKey: string,
): Promise<string> {
  const parts: Record<string, unknown>[] = [];
  const hasReferences = referenceImages && referenceImages.length > 0;

  if (hasReferences) {
    for (const img of referenceImages) {
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: { mimeType: match[1], data: match[2] },
        });
      }
    }
  }

  if (hasReferences) {
    parts.push({
      text: [
        "You MUST edit the provided image(s). Do NOT create a new image from scratch.",
        "",
        "STRICT RULES:",
        "1. The output MUST be a modified version of the input image — recognizably the same image",
        "2. Keep ALL of these EXACTLY as they are unless the user specifically asks to change them:",
        "   - Logo, brand marks, typography, and text",
        "   - Product appearance, shape, and details",
        "   - Colors, style, and visual identity",
        "   - Composition, layout, and proportions",
        "   - People/models faces, poses, and clothing",
        "3. Apply ONLY the specific changes requested below",
        "4. If asked to 'remove background' → keep the subject pixel-perfect, only remove/replace the background",
        "5. If asked to 'create a banner' → place the original image INTO the banner composition, do not redraw it",
        "6. If asked to 'add text' → overlay text on the existing image, do not regenerate it",
        "7. The result should look like a professional photo edit, NOT a new AI generation",
        "",
        `REQUESTED CHANGES: ${prompt}`,
      ].join("\n"),
    });
  } else {
    parts.push({ text: `Generate an image: ${prompt}${NO_TEXT_SUFFIX}` });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini: HTTP ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const responseParts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = responseParts.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  );

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini: no image in response");
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return `data:${mimeType};base64,${imagePart.inlineData.data}`;
}

async function tryCloudflare(prompt: string): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiKey = process.env.CF_API_TOKEN;
  if (!accountId || !apiKey) throw new Error("CF credentials not set");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt: prompt + NO_TEXT_SUFFIX }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Cloudflare: HTTP ${response.status} ${err.slice(0, 100)}`);
  }

  const data = await response.json();
  const b64 = data.result?.image;
  if (!b64) throw new Error("Cloudflare: no image data");
  return `data:image/jpeg;base64,${b64}`;
}

async function tryPollinations(
  prompt: string,
  width?: number,
  height?: number,
): Promise<string> {
  const promptWithSuffix =
    prompt + " no text no typography no letters no words clean background only";
  const clean = promptWithSuffix
    .replace(/[^\w\s,.\-:;!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  const encoded = encodeURIComponent(clean);
  const w = width ?? 1024;
  const h = height ?? 1024;

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
    const seed = Date.now() + attempt;
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
    const response = await fetch(url);
    if (response.status === 429 || response.status === 500) continue;
    if (!response.ok) throw new Error(`Pollinations: HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) continue;
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  }
  throw new Error("Pollinations: failed after 3 attempts");
}

async function tryFluxKontext(
  prompt: string,
  referenceImages: string[] | undefined,
  aspectRatio: string,
  replicateKey: string,
): Promise<string> {
  const replicate = new Replicate({ auth: replicateKey });

  const input: Record<string, unknown> = {
    prompt,
    aspect_ratio: aspectRatio,
    output_format: "png",
    safety_tolerance: 2,
  };

  if (referenceImages?.length) {
    input.input_image = referenceImages[0];
  }

  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input,
  });

  let url: string;
  if (typeof output === "string") {
    url = output;
  } else if (Array.isArray(output) && output.length > 0) {
    url = String(output[0]);
  } else {
    url = String(output);
  }

  return url;
}

// ---------------------------------------------------------------------------
// Build provider chain based on user preference
// ---------------------------------------------------------------------------

interface ProviderEntry {
  name: string;
  fn: () => Promise<string>;
}

function buildProviderChain(
  fullPrompt: string,
  referenceImages: string[] | undefined,
  aspectRatio: string,
  targetWidth: number | undefined,
  targetHeight: number | undefined,
  config: ProviderConfig | undefined,
): ProviderEntry[] {
  const googleKey =
    config?.apiKeys?.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
  const replicateKey =
    config?.apiKeys?.replicate || process.env.REPLICATE_API_TOKEN || "";
  const hasReferences = referenceImages && referenceImages.length > 0;

  // Available providers
  const gemini: ProviderEntry = {
    name: "Gemini",
    fn: () => {
      if (!googleKey) throw new Error("No Google API key available");
      return tryGemini(fullPrompt, referenceImages, googleKey);
    },
  };
  const fluxKontext: ProviderEntry = {
    name: "FLUX Kontext",
    fn: () => {
      if (!replicateKey) throw new Error("No Replicate API key available");
      return tryFluxKontext(fullPrompt, referenceImages, aspectRatio, replicateKey);
    },
  };
  const cloudflare: ProviderEntry = {
    name: "Cloudflare FLUX",
    fn: () => tryCloudflare(fullPrompt),
  };
  const pollinations: ProviderEntry = {
    name: "Pollinations",
    fn: () => tryPollinations(fullPrompt, targetWidth, targetHeight),
  };

  const preferred: ImageProvider = config?.preferredProvider ?? "auto";

  // Default fallback chain (same as original create.ts)
  const autoChain: ProviderEntry[] = hasReferences
    ? [gemini, cloudflare, pollinations]
    : [gemini, cloudflare, pollinations];

  // Smart routing: if references + replicate key, prepend FLUX Kontext
  if (hasReferences && replicateKey) {
    autoChain.unshift(fluxKontext);
  }

  switch (preferred) {
    case "nano-banana":
      return googleKey
        ? [gemini, ...autoChain.filter((p) => p.name !== "Gemini")]
        : autoChain;

    case "flux-kontext":
      return replicateKey
        ? [fluxKontext, ...autoChain.filter((p) => p.name !== "FLUX Kontext")]
        : autoChain;

    case "cloudflare":
      return [cloudflare, ...autoChain.filter((p) => p.name !== "Cloudflare FLUX")];

    case "pollinations":
      return [pollinations, ...autoChain.filter((p) => p.name !== "Pollinations")];

    case "auto":
    default:
      return autoChain;
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

interface RequestBody {
  prompt: string;
  instructions?: string;
  referenceImages?: string[];
  aspectRatio?: string;
  targetWidth?: number;
  targetHeight?: number;
  providerConfig?: ProviderConfig;
  sourceImageUrl?: string;
  action?: string;
  avatarId?: string;
}

export async function POST(req: NextRequest) {
  console.log("[generate-image] Request received");
  try {
    const body = (await req.json()) as RequestBody;
    const {
      prompt,
      instructions,
      referenceImages,
      aspectRatio = "1:1",
      targetWidth,
      targetHeight,
      providerConfig,
    } = body;

    console.log("[generate-image] Prompt length:", prompt?.length, "| refs:", referenceImages?.length ?? 0, "| aspect:", aspectRatio);
    console.log("[generate-image] Google key present:", !!process.env.GOOGLE_GENERATIVE_AI_API_KEY, "| CF:", !!process.env.CF_API_TOKEN, "| Replicate:", !!process.env.REPLICATE_API_TOKEN);

    if (!prompt) {
      return NextResponse.json({ error: "prompt is required" }, { status: 400 });
    }

    const fullPrompt = [instructions ? `Instructions: ${instructions}` : "", prompt]
      .filter(Boolean)
      .join("\n");

    // Resolve avatar face image if avatarId provided
    let avatarFaceUrl: string | undefined;
    if (body.avatarId) {
      try {
        const { createServerClient } = await import("@/lib/supabase-server");
        const db = await createServerClient();
        const { data: avatar } = await db
          .from("avatars")
          .select("face_image_url")
          .eq("id", body.avatarId)
          .single();
        if (avatar?.face_image_url) {
          avatarFaceUrl = avatar.face_image_url;
        }
      } catch (e) {
        console.log(`[generate-image] Avatar lookup failed: ${(e as Error).message}`);
      }
    }

    // Merge avatar face into reference images
    const effectiveReferenceImages = avatarFaceUrl
      ? [avatarFaceUrl, ...(referenceImages ?? [])]
      : referenceImages;

    const providers = buildProviderChain(
      fullPrompt,
      effectiveReferenceImages,
      aspectRatio,
      targetWidth,
      targetHeight,
      providerConfig,
    );

    // -----------------------------------------------------------------------
    // Refine mode: img2img using existing image
    // -----------------------------------------------------------------------
    if (body.action === "refine" && body.sourceImageUrl) {
      const userKeys = providerConfig?.apiKeys ?? {};
      const replicateKey = userKeys.replicate || process.env.REPLICATE_API_TOKEN || "";
      const googleKey = userKeys.google || process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";

      // Build refine reference list (avatar face + source image)
      const refineRefs = avatarFaceUrl
        ? [avatarFaceUrl, body.sourceImageUrl]
        : [body.sourceImageUrl];

      // Prefer FLUX Kontext for img2img (best at preserving composition)
      if (replicateKey) {
        try {
          const url = await tryFluxKontext(fullPrompt, refineRefs, aspectRatio, replicateKey);
          return NextResponse.json({ url, type: "image/png", description: prompt.slice(0, 200), provider: "FLUX Kontext (refine)" });
        } catch (e) {
          console.log(`[generate-image] FLUX Kontext refine failed: ${(e as Error).message}`);
        }
      }

      // Fallback to Gemini with source as reference
      if (googleKey) {
        try {
          const url = await tryGemini(fullPrompt, refineRefs, googleKey);
          return NextResponse.json({ url, type: "image/png", description: prompt.slice(0, 200), provider: "Gemini (refine)" });
        } catch (e) {
          console.log(`[generate-image] Gemini refine failed: ${(e as Error).message}`);
        }
      }

      return NextResponse.json(
        { error: "Refinamento requer FLUX Kontext (Replicate) ou Gemini API key configurada." },
        { status: 400 },
      );
    }

    // -----------------------------------------------------------------------
    // Batch mode: generate N options concurrently
    // -----------------------------------------------------------------------
    const numOptions = providerConfig?.numOptions ?? 1;

    if (numOptions > 1 && providers.length > 0) {
      const provider = providers[0];

      const results = await Promise.allSettled(
        Array.from({ length: numOptions }, (_, i) => {
          const variedPrompt =
            i === 0
              ? fullPrompt
              : `${fullPrompt}\n\n(Variation ${i + 1}: explore a slightly different composition, camera angle, or color mood while keeping the same concept and subject)`;

          const variedProviders = buildProviderChain(
            variedPrompt,
            effectiveReferenceImages,
            aspectRatio,
            targetWidth,
            targetHeight,
            providerConfig,
          );

          return variedProviders[0].fn().then((url) => ({
            url,
            type: "image/png" as const,
            description: prompt.slice(0, 200),
            provider: provider.name,
            variationIndex: i,
          }));
        }),
      );

      const successes = results
        .filter(
          (r): r is PromiseFulfilledResult<{
            url: string;
            type: "image/png";
            description: string;
            provider: string;
            variationIndex: number;
          }> => r.status === "fulfilled",
        )
        .map((r) => r.value);

      if (successes.length === 0) {
        const batchErrors = results
          .filter((r): r is PromiseRejectedResult => r.status === "rejected")
          .map((r) => String(r.reason));
        return NextResponse.json(
          { error: `All ${numOptions} options failed:\n${batchErrors.join("\n")}` },
          { status: 502 },
        );
      }

      return NextResponse.json({ options: successes });
    }

    // -----------------------------------------------------------------------
    // Single-image mode (default): try providers sequentially with fallback
    // -----------------------------------------------------------------------
    const errors: string[] = [];

    for (const provider of providers) {
      try {
        console.log(`[generate-image] Trying: ${provider.name}`);
        const url = await provider.fn();
        console.log(`[generate-image] Success: ${provider.name}`);
        return NextResponse.json({
          url,
          type: "image/png",
          description: prompt.slice(0, 200),
          provider: provider.name,
        });
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        console.log(`[generate-image] Failed ${provider.name}: ${msg.slice(0, 100)}`);
        errors.push(`${provider.name}: ${msg}`);
      }
    }

    console.error("[generate-image] ALL PROVIDERS FAILED:", errors);
    return NextResponse.json(
      { error: `All providers failed:\n${errors.join("\n")}` },
      { status: 502 },
    );
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[generate-image] UNCAUGHT ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
