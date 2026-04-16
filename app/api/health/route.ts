import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  const test = req.nextUrl.searchParams.get("test");

  if (test === "image") {
    // Test image providers
    const results: Record<string, string> = {};

    // Test Gemini
    try {
      const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
      if (!apiKey) throw new Error("No key");
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash-image:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: "Generate an image: A red circle on white background. Simple." }] }],
            generationConfig: { responseModalities: ["IMAGE", "TEXT"] },
          }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        results.gemini = `HTTP ${res.status}: ${err.slice(0, 300)}`;
      } else {
        const data = await res.json();
        const parts = data.candidates?.[0]?.content?.parts || [];
        const hasImage = parts.some((p: { inlineData?: unknown }) => p.inlineData);
        results.gemini = hasImage ? "OK" : "No image in response";
      }
    } catch (e) {
      results.gemini = `Error: ${(e as Error).message.slice(0, 200)}`;
    }

    // Test Cloudflare
    try {
      const accountId = process.env.CF_ACCOUNT_ID;
      const cfKey = process.env.CF_API_TOKEN;
      if (!accountId || !cfKey) throw new Error("No CF keys");
      const res = await fetch(
        `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
        {
          method: "POST",
          headers: { Authorization: `Bearer ${cfKey}` },
          body: JSON.stringify({ prompt: "A red circle on white background" }),
        },
      );
      if (!res.ok) {
        const err = await res.text();
        results.cloudflare = `HTTP ${res.status}: ${err.slice(0, 300)}`;
      } else {
        const data = await res.json();
        results.cloudflare = data.result?.image ? "OK" : "No image";
      }
    } catch (e) {
      results.cloudflare = `Error: ${(e as Error).message.slice(0, 200)}`;
    }

    return NextResponse.json({ results });
  }

  return NextResponse.json({
    ok: true,
    debug: { test, url: req.nextUrl.toString() },
    env: {
      google: !!process.env.GOOGLE_GENERATIVE_AI_API_KEY,
      googleKeyPrefix: process.env.GOOGLE_GENERATIVE_AI_API_KEY?.slice(0, 8) || "missing",
      cf: !!process.env.CF_API_TOKEN,
      replicate: !!process.env.REPLICATE_API_TOKEN,
      groq: !!process.env.GROQ_API_KEY,
    },
  });
}

