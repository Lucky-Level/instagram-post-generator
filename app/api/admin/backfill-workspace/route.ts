import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

// POST /api/admin/backfill-workspace
// Assigns all brand_agents with workspace_id = NULL to the calling user's workspace.
// Run once after migration 002 to fix existing agents.
export async function POST() {
  const db = await createServerClient();

  const {
    data: { user },
    error: authError,
  } = await db.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  // Get calling user's profile
  const { data: profile } = await db
    .from("profiles")
    .select("id")
    .eq("user_id", user.id)
    .single();

  if (!profile) {
    return NextResponse.json({ error: "Profile not found — log out and back in" }, { status: 404 });
  }

  // Get their workspace
  const { data: membership } = await db
    .from("workspace_members")
    .select("workspace_id")
    .eq("user_id", profile.id)
    .limit(1)
    .single();

  if (!membership) {
    return NextResponse.json({ error: "Workspace not found" }, { status: 404 });
  }

  // Use admin client to bypass RLS for the update
  const { createAdminClient } = await import("@/lib/supabase-server");
  const admin = createAdminClient();

  const { data, error } = await admin
    .from("brand_agents")
    .update({ workspace_id: membership.workspace_id })
    .is("workspace_id", null)
    .select("id, name");

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    workspace_id: membership.workspace_id,
    assigned: data?.length ?? 0,
    agents: data?.map((a) => a.name),
  });
}
