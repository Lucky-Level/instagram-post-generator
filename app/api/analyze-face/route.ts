import { NextRequest, NextResponse } from "next/server";
import { analyzeFace } from "@/lib/face-analysis";

export const maxDuration = 30;

export async function POST(req: NextRequest) {
  try {
    const { image, apiKey } = await req.json();
    if (!image) {
      return NextResponse.json({ error: "image (base64) is required" }, { status: 400 });
    }

    const googleKey = apiKey || process.env.GOOGLE_GENERATIVE_AI_API_KEY;
    if (!googleKey) {
      return NextResponse.json({ error: "Google API key required for face analysis" }, { status: 400 });
    }

    const result = await analyzeFace(image, googleKey);
    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : String(error);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
