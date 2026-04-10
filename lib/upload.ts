import { nanoid } from "nanoid";

export const uploadFile = async (file: File) => {
  const extension = file.name.split(".").pop();
  const name = `${nanoid()}.${extension}`;

  const formData = new FormData();
  formData.append("file", file, name);

  const response = await fetch("/api/upload", {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  const data = await response.json();

  return {
    url: data.url,
    type: file.type,
  };
};
