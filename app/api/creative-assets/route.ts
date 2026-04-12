import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await createServerClient();

    const { data, error } = await db
      .from("creative_assets")
      .insert({
        agent_id: body.agent_id || null,
        session_id: body.session_id || null,
        platform: body.platform || "instagram_feed_square",
        width: body.width || 1080,
        height: body.height || 1080,
        aspect_ratio: body.aspect_ratio || "1:1",
        base_image_url: body.base_image_url,
        final_image_url: body.final_image_url || null,
        caption: body.caption || null,
        hashtags: body.hashtags || null,
        cta: body.cta || null,
        image_prompt: body.image_prompt || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const agentId = searchParams.get("agent_id");
  const limit = parseInt(searchParams.get("limit") || "20");

  const db = await createServerClient();
  let query = db
    .from("creative_assets")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
