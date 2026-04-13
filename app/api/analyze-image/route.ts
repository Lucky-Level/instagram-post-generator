import Groq from "groq-sdk";

export const maxDuration = 30;

export async function POST(request: Request) {
  const client = new Groq({ apiKey: process.env.GROQ_API_KEY });
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl) {
      return Response.json({ error: "imageUrl é obrigatório" }, { status: 400 });
    }

    const completion = await client.chat.completions.create({
      model: "meta-llama/llama-4-scout-17b-16e-instruct",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert art director and photographer. Analyze this reference image and extract EVERYTHING needed to recreate its visual style in a new AI-generated image.

Describe in detail:
1. COMPOSITION: Rule of thirds, leading lines, symmetry, negative space, depth layers, focal point placement
2. LIGHTING: Type (natural/studio/mixed), direction, quality (soft/hard), color temperature, shadows
3. COLOR PALETTE: Exact dominant colors, accent colors, overall tone (warm/cool/neutral), saturation level
4. MOOD & ATMOSPHERE: Emotional feel, energy level, time of day, season
5. PHOTOGRAPHY STYLE: Lens type, depth of field, grain/texture, editing style, reference photographer or magazine
6. KEY ELEMENTS: Objects, textures, materials, patterns, typography if present

Output as a concise but detailed description that could be used as a prompt engineering reference. Write in English.`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 500,
    });

    const analysis = completion.choices[0]?.message?.content;

    if (!analysis) {
      return Response.json({ error: "Sem análise retornada" }, { status: 500 });
    }

    return Response.json({ analysis });
  } catch (err) {
    console.error("Image analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
