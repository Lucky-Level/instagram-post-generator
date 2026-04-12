import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const { imageUrl, sentiment, agentId, comment } = await request.json();

    if (!sentiment) {
      return NextResponse.json({ error: "Missing sentiment" }, { status: 400 });
    }

    const db = await createServerClient();

    // Save to brand_memory
    if (agentId) {
      await db.from("brand_memory").insert({
        agent_id: agentId,
        type: sentiment === "negative" ? "anti_pattern" : "feedback",
        content: JSON.stringify({
          sentiment,
          imageUrl,
          comment: comment || null,
          timestamp: new Date().toISOString(),
        }),
        weight: sentiment === "positive" ? 1 : -1,
      });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
