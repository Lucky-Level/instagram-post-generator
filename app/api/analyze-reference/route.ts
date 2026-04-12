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
              text: `You are an expert visual analyst for brand identity systems. Analyze this brand reference image and return a JSON object with EXACTLY these fields:

{
  "overallAnalysis": "2-3 sentences describing the visual style and mood",
  "dominantColors": ["#hex1", "#hex2", "#hex3", "#hex4", "#hex5"],
  "layoutStructure": "description of where text and subject are positioned",
  "typographyStyle": "one of: sans-display-heavy | sans-minimal | serif-elegant | script-fluid | mixed-hierarchy | no-text",
  "textEffects": ["outline", "hard-shadow", "soft-shadow", "gradient", "none"],
  "fontWeight": "one of: ultralight | light | regular | bold | extrabold | black",
  "charSpacingFeel": "one of: very-tight | tight | normal | wide | very-wide",
  "compositionType": "one of: text-dominant | image-dominant | balanced | text-overlay | text-integrated",
  "commercialStyle": "one of: luxury | lifestyle | bold-street | minimal-tech | playful | traditional"
}

Rules:
- overallAnalysis: 2-3 sentences summarizing the visual identity, style choices, and what makes this design effective
- dominantColors: top 5 hex color strings from the image (e.g. "#FF5733")
- layoutStructure: describe the spatial arrangement (e.g. "Text centered top third, product image fills bottom two-thirds with blurred background")
- typographyStyle: pick exactly one value from the allowed list. Use "no-text" if no text is visible.
- textEffects: array of detected effects. Pick from: "outline", "hard-shadow", "soft-shadow", "gradient", "none". Can have multiple.
- fontWeight: pick exactly one value from the allowed list based on the perceived weight of text in the image. Use "regular" if no text.
- charSpacingFeel: pick exactly one value from the allowed list based on perceived letter-spacing. Use "normal" if no text.
- compositionType: pick exactly one value from the allowed list.
- commercialStyle: pick exactly one value from the allowed list.

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
      const parsed = JSON.parse(jsonStr);

      const typographyDna = {
        style: parsed.typographyStyle ?? null,
        effects: parsed.textEffects ?? [],
        weight: parsed.fontWeight ?? null,
        charSpacing: parsed.charSpacingFeel ?? null,
        composition: parsed.compositionType ?? null,
        commercial: parsed.commercialStyle ?? null,
      };

      return Response.json({
        overallAnalysis: parsed.overallAnalysis,
        dominantColors: parsed.dominantColors,
        layoutStructure: parsed.layoutStructure,
        typographyDna,
      });
    } catch {
      // If JSON parsing fails, return structured fallback with the raw text
      return Response.json({
        overallAnalysis: raw,
        dominantColors: [],
        layoutStructure: "",
        typographyDna: null,
      });
    }
  } catch (err) {
    console.error("Deep reference analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
