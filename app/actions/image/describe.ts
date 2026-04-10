"use server";

export const describeAction = async (
  _imageUrl: string
): Promise<{ description: string } | { error: string }> => {
  return { description: "Uploaded image" };
};
