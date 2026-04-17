import { NextRequest, NextResponse } from "next/server";
import { ImageAnalysisSchema } from "@/lib/composition-schema";

export const maxDuration = 30;

const COMPOSITION_ANALYSIS_PROMPT = `You are an expert image composition analyst. Analyze this image and return a JSON object with the following structure:

{
  "subject": {
    "type": "person" | "product" | "food" | "animal" | "abstract" | "scene",
    "boundingBox": [y0, x0, y1, x1],
    "description": "brief description of the main subject",
    "needsBackgroundRemoval": true/false
  },
  "background": {
    "complexity": "simple" | "moderate" | "busy",
    "dominantColor": "#hex6",
    "description": "brief description of the background"
  },
  "lighting": {
    "direction": "left" | "right" | "top" | "even" | "dramatic",
    "brightness": "dark" | "medium" | "bright",
    "temperature": "warm" | "neutral" | "cool"
  },
  "textSafeZones": [
    {
      "region": "top" | "bottom" | "left" | "right" | "center",
      "luminance": "dark" | "medium" | "light"
    }
  ],
  "dominantColors": ["#hex6", "#hex6", "#hex6"]
}

RULES:
- boundingBox values are normalized 0-1000 (0=top-left, 1000=bottom-right), format: [y0, x0, y1, x1]
- textSafeZones: list regions where text can be placed WITHOUT overlapping the subject. Include luminance so we know if light or dark text is needed.
- dominantColors: 3 to 5 hex colors that dominate the image
- All hex colors must be 6-digit format with # prefix (e.g. #FF5500)
- needsBackgroundRemoval: true if the background is distracting or the subject would benefit from isolation
- Return ONLY valid JSON, no markdown`;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageBase64 } = body;

    if (!imageBase64) {
      return NextResponse.json(
        { error: "imageBase64 is required" },
        { status: 400 }
      );
    }

    const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GOOGLE_GENERATIVE_AI_API_KEY not configured" },
        { status: 500 }
      );
    }

    // Strip data URI prefix if present
    const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
    const mimeType = match?.[1] ?? "image/jpeg";
    const base64Data = match?.[2] ?? imageBase64;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { inlineData: { mimeType, data: base64Data } },
                { text: COMPOSITION_ANALYSIS_PROMPT },
              ],
            },
          ],
          generationConfig: {
            responseMimeType: "application/json",
            temperature: 0.1,
          },
        }),
      }
    );

    if (!response.ok) {
      const err = await response.text();
      return NextResponse.json(
        {
          error: `Gemini API error: HTTP ${response.status}`,
          details: err.slice(0, 300),
        },
        { status: 502 }
      );
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!text) {
      return NextResponse.json(
        { error: "Gemini returned no content" },
        { status: 502 }
      );
    }

    const parsed = JSON.parse(text);
    const validated = ImageAnalysisSchema.parse(parsed);

    return NextResponse.json({ analysis: validated });
  } catch (error) {
    // Zod validation errors
    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json(
        {
          error: "Gemini response failed schema validation",
          details: (error as { issues: unknown[] }).issues,
        },
        { status: 502 }
      );
    }

    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
