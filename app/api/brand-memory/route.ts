import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const { agentId, type, content } = body;

  if (!agentId || !type || !content) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const { error } = await userClient.from("brand_memory").insert({
    agent_id: agentId,
    type,
    content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
