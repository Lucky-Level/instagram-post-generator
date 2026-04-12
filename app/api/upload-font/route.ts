import { createAdminClient, createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  // Verify authenticated session
  const userClient = await createServerClient();
  const {
    data: { user },
  } = await userClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const agentId = formData.get("agentId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Sanitize font name from filename (remove extension, hyphens/underscores -> spaces, Title Case)
  const baseName = file.name.replace(/\.(ttf|woff|woff2)$/i, "");
  const fontFamily = baseName
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());

  const admin = createAdminClient();

  // Verify agentId ownership via workspace membership
  if (agentId) {
    const { data: agent } = await admin
      .from("brand_agents")
      .select("id, workspace_id")
      .eq("id", agentId)
      .single();

    if (!agent) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    if (agent.workspace_id) {
      // Check that the current user belongs to the agent's workspace
      const { data: profile } = await admin
        .from("profiles")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!profile) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }

      const { data: membership } = await admin
        .from("workspace_members")
        .select("workspace_id")
        .eq("workspace_id", agent.workspace_id)
        .eq("user_id", profile.id)
        .single();

      if (!membership) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }
  }
  const path = agentId
    ? `fonts/${agentId}/${file.name}`
    : `fonts/global/${file.name}`;

  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);

  const { error: uploadError } = await admin.storage
    .from("brand-assets")
    .upload(path, buffer, { upsert: true, contentType: file.type || "font/ttf" });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("brand-assets").getPublicUrl(path);

  // Save to font_library if agentId provided
  if (agentId) {
    await admin.from("font_library").upsert(
      {
        agent_id: agentId,
        family: fontFamily,
        source: "custom",
        category: "custom",
        url: urlData.publicUrl,
        is_favorite: true,
      },
      { onConflict: "agent_id,family" }
    );
  }

  return NextResponse.json({ url: urlData.publicUrl, fontFamily });
}
