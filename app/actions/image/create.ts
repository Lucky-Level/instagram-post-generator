"use server";

import { parseError } from "@/lib/error/parse";

interface GenerateImageActionProps {
  prompt: string;
  modelId: string;
  instructions?: string;
  referenceImages?: string[]; // base64 data URLs
}

// Provider 1: Gemini Image Generation (Nano Banana) — accepts reference images!
async function tryGemini(
  prompt: string,
  referenceImages?: string[],
): Promise<string> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_GENERATIVE_AI_API_KEY not set");

  // Build parts: text prompt + reference images
  const parts: Record<string, unknown>[] = [];

  // Add reference images first (so the model sees them before the prompt)
  if (referenceImages?.length) {
    for (const img of referenceImages) {
      const match = img.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        parts.push({
          inlineData: {
            mimeType: match[1],
            data: match[2],
          },
        });
      }
    }
  }

  // Add the text prompt
  parts.push({ text: `Generate an image: ${prompt}` });

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts }],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
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

// Provider 2: Cloudflare Workers AI (FLUX) — text-only, no reference images
async function tryCloudflare(prompt: string): Promise<string> {
  const accountId = process.env.CF_ACCOUNT_ID;
  const apiKey = process.env.CF_API_TOKEN;
  if (!accountId || !apiKey) throw new Error("CF credentials not set");

  const response = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ prompt }),
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

// Provider 3: Pollinations (free, no key, rate limited)
async function tryPollinations(prompt: string): Promise<string> {
  const clean = prompt
    .replace(/[^\w\s,.\-:;!?()]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);

  const encoded = encodeURIComponent(clean);

  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise((r) => setTimeout(r, attempt * 5000));
    }
    const seed = Date.now() + attempt;
    const url = `https://image.pollinations.ai/prompt/${encoded}?width=1024&height=1024&nologo=true&seed=${seed}`;
    const response = await fetch(url);
    if (response.status === 429 || response.status === 500) continue;
    if (!response.ok) throw new Error(`Pollinations: HTTP ${response.status}`);
    const arrayBuffer = await response.arrayBuffer();
    if (arrayBuffer.byteLength < 1000) continue;
    const base64 = Buffer.from(arrayBuffer).toString("base64");
    return `data:image/png;base64,${base64}`;
  }
  throw new Error("Pollinations: falhou após 3 tentativas");
}

export const generateImageAction = async ({
  prompt,
  instructions,
  referenceImages,
}: GenerateImageActionProps): Promise<
  | { url: string; type: string; description: string }
  | { error: string }
> => {
  const fullPrompt = [
    instructions ? `Instructions: ${instructions}` : "",
    prompt,
  ]
    .filter(Boolean)
    .join("\n");

  // If we have reference images, Gemini is the ONLY provider that can use them
  const hasReferences = referenceImages && referenceImages.length > 0;

  const providers = hasReferences
    ? [
        {
          name: "Gemini (with references)",
          fn: () => tryGemini(fullPrompt, referenceImages),
        },
        { name: "Cloudflare FLUX", fn: () => tryCloudflare(fullPrompt) },
      ]
    : [
        { name: "Gemini", fn: () => tryGemini(fullPrompt) },
        { name: "Cloudflare FLUX", fn: () => tryCloudflare(fullPrompt) },
        { name: "Pollinations", fn: () => tryPollinations(fullPrompt) },
      ];

  const errors: string[] = [];

  for (const provider of providers) {
    try {
      console.log(`Trying image provider: ${provider.name}`);
      const url = await provider.fn();
      console.log(`Success with: ${provider.name}`);
      return { url, type: "image/png", description: prompt.slice(0, 200) };
    } catch (error) {
      const msg = parseError(error);
      console.log(`Failed ${provider.name}: ${msg.slice(0, 100)}`);
      errors.push(`${provider.name}: ${msg}`);
    }
  }

  return {
    error: `Todos os providers falharam:\n${errors.join("\n")}`,
  };
};
