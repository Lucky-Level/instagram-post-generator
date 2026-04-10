import { Client } from "@gradio/client";

export const maxDuration = 180;

export async function POST(request: Request) {
  try {
    const { prompt, image } = await request.json();

    if (!prompt && !image) {
      return Response.json(
        { error: "Prompt ou imagem é obrigatório" },
        { status: 400 },
      );
    }

    // Try LTX-2 TURBO
    try {
      console.log("Video: trying LTX-2 TURBO...");
      const client = await Client.connect("alexnasa/ltx-2-TURBO");

      const result = await client.predict("/generate_video", {
        first_frame: image
          ? { url: image, meta: { _type: "gradio.FileData" } }
          : null,
        end_frame: null,
        prompt: prompt || "Make this come alive with cinematic motion",
        duration: 5,
        input_video: null,
        generation_mode: image ? "Image-to-Video" : "Text-to-Video",
        enhance_prompt: true,
        seed: 10,
        randomize_seed: true,
        height: 512,
        width: 768,
        camera_lora: "No LoRA",
        audio_path: null,
      });

      const data = result.data as [{ url: string }];
      if (data?.[0]?.url) {
        console.log("Video: LTX-2 success!");
        return Response.json({ url: data[0].url, type: "video/mp4" });
      }
    } catch (err) {
      const msg = typeof err === "object" && err !== null && "message" in err
        ? String((err as { message: unknown }).message)
        : err instanceof Error ? err.message : String(err);
      console.log("Video LTX-2 failed:", msg.slice(0, 150));

      if (msg.includes("quota") || msg.includes("No GPU") || msg.includes("exceeded")) {
        return Response.json(
          { error: "Cota de GPU esgotada hoje. A cota gratuita para vídeo reseta em algumas horas. Tente novamente mais tarde." },
          { status: 503 },
        );
      }
    }

    return Response.json(
      { error: "Não foi possível gerar o vídeo. Tente novamente mais tarde." },
      { status: 500 },
    );
  } catch (err) {
    console.error("Video generation error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
