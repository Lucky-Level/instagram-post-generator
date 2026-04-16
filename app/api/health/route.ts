import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    ok: true,
    env: {
      google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      cf: !!process.env.CF_API_TOKEN,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      groq: !!process.env.GROQ_API_KEY,
    },
  });
}
