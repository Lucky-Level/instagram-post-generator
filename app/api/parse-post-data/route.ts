// GROQ_API_KEY is required in .env.local for the Groq fallback to work.
import { extractPostData } from "@/lib/extract-post-data";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const raw = (body as Record<string, unknown>)?.raw;
  if (typeof raw !== "string" || !raw.trim()) {
    return NextResponse.json({ error: "Missing required field: raw" }, { status: 400 });
  }

  const data = await extractPostData(raw);
  if (!data) return NextResponse.json({ error: "Failed to parse" }, { status: 400 });
  return NextResponse.json(data);
}
