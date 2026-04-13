"use server";

import Replicate from "replicate";

const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });

export async function generateAdScene({
  productImageUrl,
  productDescription,
}: {
  productImageUrl: string;
  productDescription: string;
}): Promise<{ url: string } | { error: string }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { error: "REPLICATE_API_TOKEN não configurado" };
  }

  const scenePrompt = [
    `Professional advertising photography scene for: ${productDescription}.`,
    "Transform into a stunning commercial ad image.",
    "Beautiful studio lighting, elegant background, luxury product photography aesthetic.",
    "Keep the product perfectly intact and well-lit.",
    "Cinematic depth of field, professional color grading.",
    "CRITICAL: NO text, NO typography, NO logos, NO watermarks in the image.",
  ].join(" ");

  try {
    const output = await replicate.run("black-forest-labs/flux-kontext-pro", {
      input: {
        prompt: scenePrompt,
        input_image: productImageUrl,
        aspect_ratio: "1:1",
        output_format: "png",
        safety_tolerance: 2,
      },
    });

    let url: string;
    if (typeof output === "string") url = output;
    else if (Array.isArray(output) && output.length > 0) url = String(output[0]);
    else url = String(output);

    return { url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
