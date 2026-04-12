import Groq from "groq-sdk";

const client = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const maxDuration = 30;

export async function POST(request: Request) {
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
              text: `You are an expert visual analyst for brand identity systems. Analyze this reference image and return a structured JSON object with EXACTLY these fields:

{
  "dominantColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "fontStyles": ["category1", "category2"],
  "layoutStructure": "description of where text and subject are positioned",
  "visualStyle": "one word or short phrase",
  "mood": "one word or short phrase",
  "subjectPosition": "position description",
  "textPlacement": "where text appears in the image",
  "overallAnalysis": "2-3 sentence summary of the visual identity"
}

Rules:
- dominantColors: top 5 hex color strings from the image (e.g. "#FF5733")
- fontStyles: detected font style categories, pick from: "serif", "sans-serif", "display", "handwritten", "monospace". If no text is visible, return an empty array.
- layoutStructure: describe the spatial arrangement (e.g. "Text centered top third, product image fills bottom two-thirds with blurred background")
- visualStyle: one of: "minimalist", "bold", "vintage", "modern", "corporate", "playful", "elegant", "grunge", "editorial", "organic" (or combine if needed)
- mood: one of: "professional", "energetic", "calm", "luxury", "casual", "playful", "dramatic", "warm", "cool", "sophisticated"
- subjectPosition: e.g. "center", "rule-of-thirds-left", "rule-of-thirds-right", "top-third", "bottom-third", "full-bleed", "off-center-left"
- textPlacement: describe where text appears (e.g. "Bold headline top-center, subtext bottom-left") or "no text visible"
- overallAnalysis: 2-3 sentences summarizing the visual identity, style choices, and what makes this design effective

Return ONLY the JSON object, no markdown fences, no extra text.`,
            },
            {
              type: "image_url",
              image_url: { url: imageUrl },
            },
          ],
        },
      ],
      max_tokens: 800,
    });

    const raw = completion.choices[0]?.message?.content;

    if (!raw) {
      return Response.json({ error: "Sem análise retornada" }, { status: 500 });
    }

    // Parse the JSON from the response (strip markdown fences if present)
    const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
    try {
      const analysis = JSON.parse(jsonStr);
      return Response.json(analysis);
    } catch {
      // If JSON parsing fails, return structured fallback with the raw text
      return Response.json({
        dominantColors: [],
        fontStyles: [],
        layoutStructure: "",
        visualStyle: "",
        mood: "",
        subjectPosition: "",
        textPlacement: "",
        overallAnalysis: raw,
      });
    }
  } catch (err) {
    console.error("Deep reference analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
