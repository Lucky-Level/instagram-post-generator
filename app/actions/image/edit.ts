"use server";

import { parseError } from "@/lib/error/parse";

interface EditImageActionProps {
  images: { url: string; type: string }[];
  modelId: string;
  instructions?: string;
}

export const editImageAction = async (
  _props: EditImageActionProps
): Promise<{ url: string; type: string; description: string } | { error: string }> => {
  try {
    return {
      error: "Image editing is not supported yet. Connect a text node to generate a new image.",
    };
  } catch (error) {
    const message = parseError(error);
    return { error: message };
  }
};
