// GROQ_API_KEY is required in .env.local for the Groq fallback to work.
import { extractPostData } from "@/lib/extract-post-data";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { raw } = await req.json();
  const data = await extractPostData(raw);
  if (!data) return NextResponse.json({ error: "Failed to parse" }, { status: 400 });
  return NextResponse.json(data);
}
