"use server";

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateWithFacePreservation({
  prompt,
  referenceImageUrl,
  aspectRatio = "1:1",
}: {
  prompt: string;
  referenceImageUrl: string;
  aspectRatio?: string;
}): Promise<{ url: string; type: string; description: string } | { error: string }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { error: "REPLICATE_API_TOKEN not configured" };
  }

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          input_image: referenceImageUrl,
          aspect_ratio: aspectRatio,
          output_format: "png",
          safety_tolerance: 2,
        },
      }
    );

    // output can be a string URL, a ReadableStream, or an array
    let url: string;
    if (typeof output === "string") {
      url = output;
    } else if (Array.isArray(output) && output.length > 0) {
      url = String(output[0]);
    } else {
      url = String(output);
    }

    return { url, type: "image/png", description: prompt };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
