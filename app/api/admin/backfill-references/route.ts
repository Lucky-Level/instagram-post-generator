import Groq from "groq-sdk";
import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export const maxDuration = 60;

async function analyzeImage(imageUrl: string) {
  const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
  const completion = await groq.chat.completions.create({
    model: "meta-llama/llama-4-scout-17b-16e-instruct",
    messages: [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: `Analyze this brand reference image and return a JSON object with EXACTLY these fields:
{
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "layoutStructure": "description of spatial arrangement",
  "visualStyle": "one word style descriptor",
  "mood": "one word mood descriptor",
  "overallAnalysis": "2-3 sentence summary of the visual identity"
}
Return ONLY the JSON, no markdown fences.`,
          },
          { type: "image_url", image_url: { url: imageUrl } },
        ],
      },
    ],
    max_tokens: 500,
  });

  const raw = completion.choices[0]?.message?.content ?? "";
  const jsonStr = raw.replace(/```json?\s*/g, "").replace(/```\s*/g, "").trim();
  return JSON.parse(jsonStr);
}

export async function POST() {
  const db = await createServerClient();

  // Fetch all refs without analysis
  const { data: refs, error } = await db
    .from("brand_references")
    .select("id, image_url")
    .is("analysis", null)
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  if (!refs?.length) {
    return NextResponse.json({ message: "No references to backfill", processed: 0 });
  }

  const results = { processed: 0, failed: 0, errors: [] as string[] };

  for (const ref of refs) {
    try {
      const analysis = await analyzeImage(ref.image_url);

      await db
        .from("brand_references")
        .update({
          analysis: analysis.overallAnalysis || null,
          extracted_colors: analysis.dominantColors || null,
          extracted_layout: analysis.layoutStructure || null,
        })
        .eq("id", ref.id);

      results.processed++;
    } catch (err) {
      results.failed++;
      results.errors.push(`${ref.id}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return NextResponse.json(results);
}
