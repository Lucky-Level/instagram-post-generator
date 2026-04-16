import { createServerClient } from "@/lib/supabase-server";
import { NextRequest, NextResponse } from "next/server";

// GET /api/avatars?agentId=xxx
export async function GET(req: NextRequest) {
  const agentId = req.nextUrl.searchParams.get("agentId");
  if (!agentId) return NextResponse.json({ error: "agentId required" }, { status: 400 });

  const db = await createServerClient();
  const { data, error } = await db
    .from("avatars")
    .select("*")
    .eq("brand_agent_id", agentId)
    .order("created_at", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// POST /api/avatars
export async function POST(req: NextRequest) {
  const body = await req.json();
  const { brandAgentId, name, role, faceImageUrl } = body;

  if (!brandAgentId || !name || !faceImageUrl) {
    return NextResponse.json({ error: "brandAgentId, name, faceImageUrl required" }, { status: 400 });
  }

  const db = await createServerClient();
  const { data, error } = await db
    .from("avatars")
    .insert({ brand_agent_id: brandAgentId, name, role: role ?? "model", face_image_url: faceImageUrl })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// DELETE /api/avatars?id=xxx
export async function DELETE(req: NextRequest) {
  const id = req.nextUrl.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id required" }, { status: 400 });

  const db = await createServerClient();
  const { error } = await db.from("avatars").delete().eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
