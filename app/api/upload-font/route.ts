import { createAdminClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
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
