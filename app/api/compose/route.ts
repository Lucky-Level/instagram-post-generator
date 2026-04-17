import { NextRequest, NextResponse } from "next/server";
import Replicate from "replicate";
import { CompositionPlanSchema } from "@/lib/composition-schema";
import type { CompositionPlan, CompositionOperation } from "@/lib/composition-schema";

export const maxDuration = 60;

// ---------------------------------------------------------------------------
// Helper: strip data-URI prefix, return { mimeType, data }
// ---------------------------------------------------------------------------

function parseBase64(input: string): { mimeType: string; data: string } {
  const match = input.match(/^data:([^;]+);base64,(.+)$/);
  if (match) return { mimeType: match[1], data: match[2] };
  // Assume raw base64 PNG if no prefix
  return { mimeType: "image/png", data: input };
}

function toDataUri(mimeType: string, data: string): string {
  return `data:${mimeType};base64,${data}`;
}

// ---------------------------------------------------------------------------
// Gemini edit: single image + text instruction
// ---------------------------------------------------------------------------

async function geminiEdit(
  imageBase64: string,
  instruction: string,
  apiKey: string,
): Promise<string> {
  const { mimeType, data } = parseBase64(imageBase64);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType, data } },
              {
                text: [
                  "You are an image editor. Edit this image following the instructions below.",
                  "CRITICAL: Preserve EVERYTHING in the original image except what is specifically asked to change.",
                  "Keep the same person, same clothing, same colors, same logo, same style.",
                  "Make ONLY the requested change, nothing else.",
                  "",
                  `Instructions: ${instruction}`,
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini edit: HTTP ${response.status} ${err.slice(0, 200)}`);
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini edit: no image in response");
  }

  const outMime = imagePart.inlineData.mimeType || "image/png";
  return toDataUri(outMime, imagePart.inlineData.data);
}

// ---------------------------------------------------------------------------
// Gemini edit with reference: source image + reference image + instruction
// ---------------------------------------------------------------------------

async function geminiEditWithReference(
  sourceImage: string,
  referenceImage: string,
  instruction: string,
  apiKey: string,
): Promise<string> {
  const src = parseBase64(sourceImage);
  const ref = parseBase64(referenceImage);

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { inlineData: { mimeType: src.mimeType, data: src.data } },
              { inlineData: { mimeType: ref.mimeType, data: ref.data } },
              {
                text: [
                  "You MUST edit the first image using the second image as a face/appearance reference.",
                  "STRICT RULES:",
                  "1. The output MUST be a modified version of the FIRST image",
                  "2. Replace the person's face/appearance using the SECOND image as reference",
                  "3. Keep the pose, clothing, background, and composition from the FIRST image",
                  "4. The result should look natural and seamless",
                  "",
                  `REQUESTED CHANGES: ${instruction}`,
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(
      `Gemini edit (ref): HTTP ${response.status} ${err.slice(0, 200)}`,
    );
  }

  const json = await response.json();
  const parts = json.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p: { inlineData?: unknown }) => p.inlineData);

  if (!imagePart?.inlineData?.data) {
    throw new Error("Gemini edit (ref): no image in response");
  }

  const outMime = imagePart.inlineData.mimeType || "image/png";
  return toDataUri(outMime, imagePart.inlineData.data);
}

// ---------------------------------------------------------------------------
// FLUX Kontext Pro: face/character replacement via Replicate
// ---------------------------------------------------------------------------

async function fluxKontextReplace(
  sourceImage: string,
  _avatarFace: string,
  instruction: string,
  replicateKey: string,
): Promise<string> {
  const replicate = new Replicate({ auth: replicateKey });

  // FLUX Kontext takes the source image as input_image and the prompt
  // describes what to do (including reference to the avatar face)
  const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
    input: {
      input_image: sourceImage,
      prompt: instruction,
      aspect_ratio: "1:1",
      output_format: "png",
      safety_tolerance: 2,
    },
  });

  let url: string;
  if (typeof output === "string") {
    url = output;
  } else if (Array.isArray(output) && output.length > 0) {
    url = String(output[0]);
  } else {
    url = String(output);
  }

  // Fetch the URL and convert to base64 data URI for pipeline consistency
  const imgResponse = await fetch(url);
  if (!imgResponse.ok) {
    throw new Error(
      `FLUX Kontext: failed to fetch result image (HTTP ${imgResponse.status})`,
    );
  }
  const buffer = Buffer.from(await imgResponse.arrayBuffer());
  const b64 = buffer.toString("base64");
  return `data:image/png;base64,${b64}`;
}

// ---------------------------------------------------------------------------
// Build instruction strings for each operation type
// ---------------------------------------------------------------------------

function buildRemoveBackgroundInstruction(
  op: Extract<CompositionOperation, { type: "remove-background" }>,
): string {
  return `Remove the background completely, making it transparent/white. Keep the main subject perfectly intact. Reason: ${op.reason}`;
}

function buildReplaceCharacterInstruction(
  op: Extract<CompositionOperation, { type: "replace-character" }>,
): string {
  const parts = [`Replace the character in this image: ${op.description}`];
  if (op.preservePose) parts.push("IMPORTANT: Preserve the exact same pose.");
  if (op.preserveClothing)
    parts.push("IMPORTANT: Preserve the exact same clothing.");
  return parts.join(" ");
}

function buildRemoveObjectInstruction(
  op: Extract<CompositionOperation, { type: "remove-object" }>,
): string {
  const [y0, x0, y1, x1] = op.region;
  const topPct = (y0 / 10).toFixed(1);
  const leftPct = (x0 / 10).toFixed(1);
  const bottomPct = (y1 / 10).toFixed(1);
  const rightPct = (x1 / 10).toFixed(1);
  return `Remove the object described as "${op.description}" located in the region from top ${topPct}%, left ${leftPct}% to bottom ${bottomPct}%, right ${rightPct}%. Fill the area naturally with the surrounding content.`;
}

function buildColorAdjustInstruction(
  op: Extract<CompositionOperation, { type: "color-adjust" }>,
): string {
  const adjustments: string[] = [];
  if (op.brightness !== 0)
    adjustments.push(
      `brightness ${op.brightness > 0 ? "+" : ""}${op.brightness}%`,
    );
  if (op.contrast !== 0)
    adjustments.push(
      `contrast ${op.contrast > 0 ? "+" : ""}${op.contrast}%`,
    );
  if (op.saturation !== 0)
    adjustments.push(
      `saturation ${op.saturation > 0 ? "+" : ""}${op.saturation}%`,
    );
  if (op.temperature !== 0)
    adjustments.push(
      `color temperature ${op.temperature > 0 ? "warmer" : "cooler"} by ${Math.abs(op.temperature)} units`,
    );
  if (adjustments.length === 0) return "Keep the image as is.";
  return `Adjust the image colors: ${adjustments.join(", ")}. Reason: ${op.reason}`;
}

function buildAddOverlayInstruction(
  op: Extract<CompositionOperation, { type: "add-overlay" }>,
): string {
  const gradientStr = op.gradient ? "gradient" : "solid";
  const regionMap: Record<string, string> = {
    full: "the entire image",
    "top-half": "the top half of the image",
    "bottom-half": "the bottom half of the image",
    "left-half": "the left half of the image",
    "right-half": "the right half of the image",
  };
  const regionStr = regionMap[op.region] || op.region;
  return `Add a ${gradientStr} ${op.color} overlay with ${Math.round(op.opacity * 100)}% opacity on ${regionStr}. The overlay should make text more readable. Reason: ${op.reason}`;
}

function buildCropReframeInstruction(
  op: Extract<CompositionOperation, { type: "crop-reframe" }>,
): string {
  const focusMap: Record<string, string> = {
    "subject-center": "centering the main subject",
    "rule-of-thirds-left":
      "placing the subject on the left third (rule of thirds)",
    "rule-of-thirds-right":
      "placing the subject on the right third (rule of thirds)",
    "top-weighted": "keeping the focus on the upper portion",
    "bottom-weighted": "keeping the focus on the lower portion",
  };
  const focusStr = focusMap[op.focus] || op.focus;
  return `Reframe/crop this image to a 1:1 square aspect ratio, ${focusStr}. Maintain the subject's quality and details. Reason: ${op.reason}`;
}

// ---------------------------------------------------------------------------
// Execute a single operation
// ---------------------------------------------------------------------------

async function executeOperation(
  op: CompositionOperation,
  currentImage: string,
  avatarFaceUrl: string | undefined,
  googleKey: string,
  replicateKey: string,
): Promise<{ image: string; provider: string }> {
  switch (op.type) {
    case "remove-background": {
      const instruction = buildRemoveBackgroundInstruction(op);
      const result = await geminiEdit(currentImage, instruction, googleKey);
      return { image: result, provider: "gemini-edit" };
    }

    case "replace-character": {
      const instruction = buildReplaceCharacterInstruction(op);

      // Prefer FLUX Kontext if avatar face + Replicate key available
      if (avatarFaceUrl && replicateKey) {
        try {
          const result = await fluxKontextReplace(
            currentImage,
            avatarFaceUrl,
            instruction,
            replicateKey,
          );
          return { image: result, provider: "flux-kontext" };
        } catch (e) {
          console.log(
            `[compose] FLUX Kontext replace failed: ${(e as Error).message}, falling back to Gemini`,
          );
        }
      }

      // Fallback: Gemini with reference image
      if (avatarFaceUrl && googleKey) {
        const result = await geminiEditWithReference(
          currentImage,
          avatarFaceUrl,
          instruction,
          googleKey,
        );
        return { image: result, provider: "gemini-edit" };
      }

      // No avatar face — just use Gemini with instruction only
      if (googleKey) {
        const result = await geminiEdit(currentImage, instruction, googleKey);
        return { image: result, provider: "gemini-edit" };
      }

      throw new Error(
        "replace-character requires either REPLICATE_API_TOKEN or GOOGLE_API_KEY",
      );
    }

    case "remove-object": {
      const instruction = buildRemoveObjectInstruction(op);
      const result = await geminiEdit(currentImage, instruction, googleKey);
      return { image: result, provider: "gemini-edit" };
    }

    case "color-adjust": {
      const instruction = buildColorAdjustInstruction(op);
      const result = await geminiEdit(currentImage, instruction, googleKey);
      return { image: result, provider: "gemini-edit" };
    }

    case "add-overlay": {
      const instruction = buildAddOverlayInstruction(op);
      const result = await geminiEdit(currentImage, instruction, googleKey);
      return { image: result, provider: "gemini-edit" };
    }

    case "crop-reframe": {
      const instruction = buildCropReframeInstruction(op);
      const result = await geminiEdit(currentImage, instruction, googleKey);
      return { image: result, provider: "gemini-edit" };
    }

    default: {
      const _exhaustive: never = op;
      throw new Error(
        `Unknown operation type: ${(_exhaustive as CompositionOperation).type}`,
      );
    }
  }
}

// ---------------------------------------------------------------------------
// POST handler
// ---------------------------------------------------------------------------

interface ComposeRequestBody {
  plan: CompositionPlan;
  sourceImage: string;
  avatarFaceUrl?: string;
  brandColors?: {
    primary: string;
    secondary: string;
    accent: string;
  };
}

export async function POST(req: NextRequest) {
  console.log("[compose] Request received");

  try {
    const body = (await req.json()) as ComposeRequestBody;
    const { sourceImage, avatarFaceUrl } = body;

    // Validate plan against schema
    const planResult = CompositionPlanSchema.safeParse(body.plan);
    if (!planResult.success) {
      return NextResponse.json(
        { error: `Invalid composition plan: ${planResult.error.message}` },
        { status: 400 },
      );
    }
    const plan = planResult.data;

    if (!sourceImage) {
      return NextResponse.json(
        { error: "sourceImage is required" },
        { status: 400 },
      );
    }

    const googleKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY || "";
    const replicateKey = process.env.REPLICATE_API_TOKEN || "";

    if (!googleKey && !replicateKey) {
      return NextResponse.json(
        {
          error:
            "No API keys configured. Set GOOGLE_GENERATIVE_AI_API_KEY or REPLICATE_API_TOKEN.",
        },
        { status: 500 },
      );
    }

    if (!googleKey) {
      return NextResponse.json(
        {
          error:
            "GOOGLE_GENERATIVE_AI_API_KEY is required for composition operations.",
        },
        { status: 500 },
      );
    }

    const operations = plan.operations;
    console.log(
      `[compose] Executing ${operations.length} operations, provider hint: ${plan.provider}`,
    );

    let currentImage = sourceImage;
    let lastProvider = "none";
    let opsExecuted = 0;

    for (const op of operations) {
      console.log(
        `[compose] Operation ${opsExecuted + 1}/${operations.length}: ${op.type}`,
      );
      try {
        const result = await executeOperation(
          op,
          currentImage,
          avatarFaceUrl,
          googleKey,
          replicateKey,
        );
        currentImage = result.image;
        lastProvider = result.provider;
        opsExecuted++;
        console.log(
          `[compose] Operation ${op.type} completed via ${result.provider}`,
        );
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error(`[compose] Operation ${op.type} failed: ${msg}`);
        return NextResponse.json(
          {
            error: `Operation ${op.type} (step ${opsExecuted + 1}) failed: ${msg}`,
            composedImage: opsExecuted > 0 ? currentImage : undefined,
            operationsExecuted: opsExecuted,
          },
          { status: 502 },
        );
      }
    }

    console.log(
      `[compose] All ${opsExecuted} operations completed successfully`,
    );

    return NextResponse.json({
      composedImage: currentImage,
      operationsExecuted: opsExecuted,
      provider: lastProvider,
      reasoning: plan.reasoning,
    });
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    console.error("[compose] UNCAUGHT ERROR:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
