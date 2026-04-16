// lib/face-analysis.ts
// Uses Gemini Vision to analyze facial features and generate a detailed prompt

export interface FaceAnalysisResult {
  prompt: string;        // Detailed face description for AI generation
  descriptor: string;    // Human-readable feature list
  attributes: {
    faceShape: string;
    eyeShape: string;
    noseType: string;
    mouthType: string;
    jawType: string;
    skinTone: string;
    hairColor: string;
    hairStyle: string;
    hairLength: string;
    eyebrowShape: string;
    estimatedAge: string;
    gender: string;
    distinctiveFeatures: string[];
  };
}

const FACE_ANALYSIS_PROMPT = `You are a facial feature analyst. Analyze this face image in extreme detail for the purpose of recreating this person's likeness in AI-generated images.

Return a JSON object with these EXACT fields:

{
  "faceShape": "oval|round|square|heart|oblong|diamond",
  "eyeShape": "describe shape, size, distance apart (close-set, normal, wide-set), color",
  "noseType": "describe length, width, bridge shape, tip shape",
  "mouthType": "describe width, lip fullness (thin/medium/full), shape",
  "jawType": "describe strength, width, angle (sharp/soft/rounded)",
  "skinTone": "describe tone (fair/light/medium/olive/tan/brown/dark), undertone (warm/cool/neutral), texture",
  "hairColor": "exact color with highlights/lowlights if visible",
  "hairStyle": "straight/wavy/curly/coily, how it's styled",
  "hairLength": "short/medium/long/very long, approximate length",
  "eyebrowShape": "thick/thin, arched/straight/rounded, groomed/natural",
  "estimatedAge": "age range e.g. 25-30",
  "gender": "masculine/feminine/androgynous presentation",
  "distinctiveFeatures": ["list any notable features: dimples, freckles, moles, scars, piercings, glasses, facial hair, etc."],
  "facePrompt": "A single detailed paragraph (100-150 words) describing this person's face as if writing a prompt for an AI image generator. Include ALL features above. Be specific about proportions and spatial relationships (e.g., 'wide-set almond eyes', 'high cheekbones with a narrow chin'). This must be detailed enough to recreate a recognizable likeness."
}

IMPORTANT:
- Be extremely precise and specific
- Describe spatial relationships (distance between features, proportions)
- Note any asymmetry
- The facePrompt should read naturally, not as a list
- Return ONLY valid JSON, no markdown`;

export async function analyzeFace(imageBase64: string, apiKey: string): Promise<FaceAnalysisResult> {
  const match = imageBase64.match(/^data:([^;]+);base64,(.+)$/);
  const mimeType = match?.[1] ?? "image/jpeg";
  const base64Data = match?.[2] ?? imageBase64;

  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{
          parts: [
            { inlineData: { mimeType, data: base64Data } },
            { text: FACE_ANALYSIS_PROMPT },
          ],
        }],
        generationConfig: {
          responseMimeType: "application/json",
          temperature: 0.1,
        },
      }),
    }
  );

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Gemini face analysis failed: HTTP ${response.status} ${err.slice(0, 200)}`);
  }

  const data = await response.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) throw new Error("Gemini returned no text in face analysis");

  const parsed = JSON.parse(text);

  return {
    prompt: parsed.facePrompt,
    descriptor: [
      `Rosto: ${parsed.faceShape}`,
      `Olhos: ${parsed.eyeShape}`,
      `Nariz: ${parsed.noseType}`,
      `Boca: ${parsed.mouthType}`,
      `Mandibula: ${parsed.jawType}`,
      `Pele: ${parsed.skinTone}`,
      `Cabelo: ${parsed.hairColor}, ${parsed.hairStyle}, ${parsed.hairLength}`,
      `Sobrancelhas: ${parsed.eyebrowShape}`,
      `Idade: ~${parsed.estimatedAge}`,
      `Genero: ${parsed.gender}`,
      parsed.distinctiveFeatures?.length > 0 ? `Marcas: ${parsed.distinctiveFeatures.join(", ")}` : "",
    ].filter(Boolean).join("\n"),
    attributes: {
      faceShape: parsed.faceShape,
      eyeShape: parsed.eyeShape,
      noseType: parsed.noseType,
      mouthType: parsed.mouthType,
      jawType: parsed.jawType,
      skinTone: parsed.skinTone,
      hairColor: parsed.hairColor,
      hairStyle: parsed.hairStyle,
      hairLength: parsed.hairLength,
      eyebrowShape: parsed.eyebrowShape,
      estimatedAge: parsed.estimatedAge,
      gender: parsed.gender,
      distinctiveFeatures: parsed.distinctiveFeatures ?? [],
    },
  };
}
