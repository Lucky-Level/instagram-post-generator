import { NextResponse } from "next/server";
import sharp from "sharp";

interface ComposeRequest {
  imageUrl: string;
  width: number;
  height: number;
  fit?: "cover" | "contain" | "fill";
  background?: string;
}

export async function POST(request: Request) {
  try {
    const body: ComposeRequest = await request.json();
    const { imageUrl, width, height, fit = "cover", background = "#000000" } = body;

    if (!imageUrl || !width || !height) {
      return NextResponse.json(
        { error: "Missing imageUrl, width, or height" },
        { status: 400 }
      );
    }

    // Fetch the source image
    let imageBuffer: Buffer;

    if (imageUrl.startsWith("data:")) {
      // Handle data URLs
      const base64Data = imageUrl.split(",")[1];
      if (!base64Data) {
        return NextResponse.json(
          { error: "Invalid data URL" },
          { status: 400 }
        );
      }
      imageBuffer = Buffer.from(base64Data, "base64");
    } else {
      // Handle regular URLs
      const response = await fetch(imageUrl);
      if (!response.ok) {
        return NextResponse.json(
          { error: "Failed to fetch source image" },
          { status: 400 }
        );
      }
      const arrayBuffer = await response.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuffer);
    }

    // Parse background color to RGB
    const bgHex = background.replace("#", "");
    const r = parseInt(bgHex.substring(0, 2), 16) || 0;
    const g = parseInt(bgHex.substring(2, 4), 16) || 0;
    const b = parseInt(bgHex.substring(4, 6), 16) || 0;

    // Resize/crop with Sharp
    const outputBuffer = await sharp(imageBuffer)
      .resize(width, height, {
        fit: fit as keyof sharp.FitEnum,
        position: "center",
        background: { r, g, b, alpha: 1 },
      })
      .png({ compressionLevel: 6 })
      .toBuffer();

    // Convert to data URL
    const base64 = outputBuffer.toString("base64");
    const dataUrl = `data:image/png;base64,${base64}`;

    return NextResponse.json({
      url: dataUrl,
      width,
      height,
      format: "png",
    });
  } catch (error) {
    return NextResponse.json(
      { error: (error as Error).message },
      { status: 500 }
    );
  }
}
