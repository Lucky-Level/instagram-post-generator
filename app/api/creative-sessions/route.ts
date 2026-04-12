import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const db = await createServerClient();

    const { data, error } = await db
      .from("creative_sessions")
      .insert({
        agent_id: body.agent_id || null,
        type: body.type || "post_single",
        brief: body.brief || null,
        platforms: body.platforms || ["instagram_feed_square"],
        complexity_layer: body.complexity_layer || 1,
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

  const db = await createServerClient();
  let query = db
    .from("creative_sessions")
    .select("*, creative_assets(*)")
    .order("created_at", { ascending: false })
    .limit(10);

  if (agentId) {
    query = query.eq("agent_id", agentId);
  }

  const { data, error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}
