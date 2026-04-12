import { nanoid } from "nanoid";
import { NextResponse } from "next/server";
import { createServerClient } from "@/lib/supabase-server";

export const POST = async (request: Request) => {
  try {
    const formData = await request.formData();
    const file = formData.get("file") as File | null;

    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const ext = file.name.split(".").pop() || "bin";
    const filename = `${nanoid()}.${ext}`;
    const path = `assets/${filename}`;

    const db = await createServerClient();
    const { error } = await db.storage
      .from("uploads")
      .upload(path, buffer, {
        contentType: file.type,
        upsert: false,
      });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: urlData } = db.storage.from("uploads").getPublicUrl(path);

    return NextResponse.json({
      url: urlData.publicUrl,
      type: file.type,
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 400 },
    );
  }
};
