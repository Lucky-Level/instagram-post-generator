"use server";

import { parseError } from "@/lib/error/parse";

interface GenerateVideoActionProps {
  modelId: string;
  prompt: string;
  image?: string;
}

export const generateVideoAction = async ({
  prompt,
  image,
}: GenerateVideoActionProps): Promise<
  { url: string; type: string } | { error: string }
> => {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/generate-video`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt, image }),
    });

    const data = await response.json();

    if (!response.ok || data.error) {
      return { error: data.error || "Erro ao gerar vídeo" };
    }

    return { url: data.url, type: data.type };
  } catch (error) {
    return { error: parseError(error) };
  }
};
