import { Client } from "@gradio/client";

export const maxDuration = 60;

export async function POST(request: Request) {
  try {
    const { imageBase64, action, prompt } = await request.json();

    if (!imageBase64) {
      return Response.json({ error: "Imagem é obrigatória" }, { status: 400 });
    }

    if (action === "remove-background") {
      return await removeBackground(imageBase64);
    }

    if (action === "edit") {
      return await editWithGemini(imageBase64, prompt || "Edit this image");
    }

    return Response.json({ error: "Ação inválida" }, { status: 400 });
  } catch (err) {
    console.error("Edit image error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}

async function removeBackground(imageBase64: string) {
  try {
    const client = await Client.connect("ZhengPeng7/BiRefNet_demo");

    // Convert base64 to blob for upload
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    if (!match) throw new Error("Invalid base64 image");

    const buffer = Buffer.from(match[2], "base64");
    const blob = new Blob([buffer], { type: match[1] });

    const result = await client.predict("/image", {
      image: blob,
    });

    const data = result.data as [{ url: string }];
    if (!data?.[0]?.url) {
      throw new Error("No result from background removal");
    }

    // Fetch the result image and convert to base64
    const imgResponse = await fetch(data[0].url);
    const imgBuffer = Buffer.from(await imgResponse.arrayBuffer());
    const b64 = imgBuffer.toString("base64");

    return Response.json({
      url: `data:image/png;base64,${b64}`,
      type: "image/png",
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("quota") || msg.includes("No GPU")) {
      return Response.json(
        { error: "Cota de GPU esgotada. Tente novamente mais tarde." },
        { status: 503 },
      );
    }
    throw err;
  }
}

async function editWithGemini(imageBase64: string, prompt: string) {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    return Response.json(
      { error: "Google API key não configurada" },
      { status: 500 },
    );
  }

  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    return Response.json({ error: "Invalid image" }, { status: 400 });
  }

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          {
            parts: [
              {
                inlineData: {
                  mimeType: match[1],
                  data: match[2],
                },
              },
              {
                text: [
                  "You are an image editor. Edit this image following the instructions below.",
                  "CRITICAL: Preserve EVERYTHING in the original image except what is specifically asked to change.",
                  "Keep the same person, same clothing, same colors, same logo, same style.",
                  "Make ONLY the requested change, nothing else.",
                  "",
                  `Instructions: ${prompt}`,
                ].join("\n"),
              },
            ],
          },
        ],
        generationConfig: {
          responseModalities: ["IMAGE", "TEXT"],
        },
      }),
    },
  );

  if (!response.ok) {
    const err = await response.text();
    return Response.json(
      { error: `Gemini: ${err.slice(0, 200)}` },
      { status: 500 },
    );
  }

  const data = await response.json();
  const parts = data.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find(
    (p: { inlineData?: unknown }) => p.inlineData,
  );

  if (!imagePart?.inlineData?.data) {
    return Response.json(
      { error: "Gemini não retornou imagem editada" },
      { status: 500 },
    );
  }

  const mimeType = imagePart.inlineData.mimeType || "image/png";
  return Response.json({
    url: `data:${mimeType};base64,${imagePart.inlineData.data}`,
    type: mimeType,
  });
}
