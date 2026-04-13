"use server";

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function editWithFlux(params: {
  imageUrl: string;   // data URL ou URL pública da imagem atual
  prompt: string;     // instrução de edição em linguagem natural
  aspectRatio?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { error: "REPLICATE_API_TOKEN não configurado" };
  }

  const { imageUrl, prompt, aspectRatio = "1:1" } = params;

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          input_image: imageUrl,
          aspect_ratio: aspectRatio,
          output_format: "png",
          safety_tolerance: 2,
        },
      },
    );

    let url: string;
    if (typeof output === "string") {
      url = output;
    } else if (Array.isArray(output) && output.length > 0) {
      url = String(output[0]);
    } else {
      url = String(output);
    }

    return { url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
