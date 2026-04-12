import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

// GET /api/brand-agents — list all brand agents
export async function GET() {
  const db = await createServerClient();
  const { data, error } = await db
    .from("brand_agents")
    .select("id, name, slug, avatar_url, personality, brand_kit, total_sessions, total_assets, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/brand-agents — create a new brand agent
export async function POST(req: Request) {
  const body = await req.json();
  const db = await createServerClient();

  const slug = body.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

  const { data, error } = await db
    .from("brand_agents")
    .insert({
      name: body.name,
      slug,
      avatar_url: body.avatar_url || null,
      personality: body.personality || {},
      brand_kit: body.brand_kit || {},
      platform_rules: body.platform_rules || {},
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // If references were provided, insert them
  if (body.references?.length) {
    const refs = body.references.map((ref: {
      url: string;
      is_anti: boolean;
      analysis?: string;
      dominantColors?: string[];
      layoutStructure?: string;
      visualStyle?: string;
      mood?: string;
    }) => ({
      agent_id: data.id,
      image_url: ref.url,
      is_anti_reference: ref.is_anti || false,
      analysis: ref.analysis || null,
      extracted_colors: ref.dominantColors || null,
      extracted_layout: ref.layoutStructure || null,
      tags: ref.is_anti ? ["anti-referencia"] : ["moodboard", "aprovado"],
      source: "upload",
    }));

    await db.from("brand_references").insert(refs);
  }

  // If fonts were provided, insert them
  if (body.fonts?.length) {
    const fonts = body.fonts.map((f: { family: string; category: string; role?: string }) => ({
      agent_id: data.id,
      family: f.family,
      category: f.category,
      role: f.role || null,
      is_favorite: true,
      source: "google",
    }));

    await db.from("font_library").insert(fonts);
  }

  return NextResponse.json(data, { status: 201 });
}
