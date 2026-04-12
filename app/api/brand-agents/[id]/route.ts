import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/brand-agents/:id — get a single brand agent with references
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createServerClient();

  const [agentRes, refsRes] = await Promise.all([
    db.from("brand_agents").select("*").eq("id", id).single(),
    db.from("brand_references").select("*").eq("agent_id", id).order("created_at"),
  ]);

  if (agentRes.error) {
    return NextResponse.json({ error: agentRes.error.message }, { status: 404 });
  }

  return NextResponse.json({
    ...agentRes.data,
    references: refsRes.data || [],
  });
}

// PATCH /api/brand-agents/:id — update a brand agent
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const db = await createServerClient();

  const { data, error } = await db
    .from("brand_agents")
    .update({
      ...(body.name && { name: body.name }),
      ...(body.avatar_url !== undefined && { avatar_url: body.avatar_url }),
      ...(body.personality && { personality: body.personality }),
      ...(body.brand_kit && { brand_kit: body.brand_kit }),
      ...(body.platform_rules && { platform_rules: body.platform_rules }),
    })
    .eq("id", id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// DELETE /api/brand-agents/:id — delete a brand agent and its references
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = await createServerClient();

  // Delete references first (foreign key)
  await db.from("brand_references").delete().eq("agent_id", id);
  await db.from("brand_memory").delete().eq("agent_id", id);

  const { error } = await db.from("brand_agents").delete().eq("id", id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
