import { NextResponse } from "next/server";
import sharp from "sharp";

interface ComposePostRequest {
  backgroundUrl: string; // data URL ou URL pública
  typographyPng?: string; // data URL PNG da camada de tipografia (opcional)
  logoUrl?: string; // URL da logo (opcional)
  logoPosition?: { x: number; y: number; width: number };
  productLayerUrl?: string; // PNG transparente do produto recortado (opcional)
  width?: number;  // dimensão do canvas (default 1080)
  height?: number; // dimensão do canvas (default 1080)
}

async function urlToBuffer(url: string): Promise<Buffer> {
  if (url.startsWith("data:")) {
    const base64 = url.split(",")[1];
    return Buffer.from(base64, "base64");
  }
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${url}`);
  return Buffer.from(await res.arrayBuffer());
}

export async function POST(req: Request) {
  try {
    const body: ComposePostRequest = await req.json();
    const { backgroundUrl, typographyPng, logoUrl, logoPosition, productLayerUrl } = body;

    if (!backgroundUrl) {
      return NextResponse.json({ error: "backgroundUrl required" }, { status: 400 });
    }

    const W = body.width ?? 1080;
    const H = body.height ?? 1080;

    const bgBuffer = await urlToBuffer(backgroundUrl);

    // Collect composite layers
    const layers: sharp.OverlayOptions[] = [];

    // 1b. Product layer (transparent PNG cutout) — below typography
    if (productLayerUrl) {
      const productBuffer = await urlToBuffer(productLayerUrl);
      const PRODUCT_W = Math.round(W * 0.65);
      const resizedProduct = await sharp(productBuffer)
        .resize(PRODUCT_W, Math.round(H * 0.75), { fit: "inside", withoutEnlargement: false })
        .toBuffer();
      const productMeta = await sharp(resizedProduct).metadata();
      const pw = productMeta.width ?? PRODUCT_W;
      const ph = productMeta.height ?? Math.round(H * 0.75);
      const left = Math.round((W - pw) / 2);
      const top = Math.round((H - ph) / 2);
      layers.push({ input: resizedProduct, top, left });
    }

    // 2. Typography layer (PNG transparente)
    if (typographyPng) {
      const typoBuffer = await urlToBuffer(typographyPng);
      const resizedTypo = await sharp(typoBuffer)
        .resize(W, H, { fit: "fill" })
        .toBuffer();
      layers.push({ input: resizedTypo, top: 0, left: 0 });
    }

    // 3. Logo layer
    if (logoUrl && logoPosition) {
      try {
        const logoBuffer = await urlToBuffer(logoUrl);
        const resizedLogo = await sharp(logoBuffer)
          .resize(logoPosition.width, undefined, { fit: "inside" })
          .toBuffer();
        layers.push({
          input: resizedLogo,
          top: Math.round(logoPosition.y),
          left: Math.round(logoPosition.x),
        });
      } catch {
        // Logo falhou silenciosamente — continua sem ela
      }
    }

    // 4. Composite all layers (skip composite call when layers is empty)
    const pipeline = sharp(bgBuffer).resize(W, H, { fit: "cover", position: "center" });
    const outputBuffer = await (layers.length > 0 ? pipeline.composite(layers) : pipeline)
      .png({ compressionLevel: 6 })
      .toBuffer();

    const base64 = outputBuffer.toString("base64");

    return NextResponse.json({
      url: `data:image/png;base64,${base64}`,
      width: W,
      height: H,
    });
  } catch (error) {
    console.error("[compose-post]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
