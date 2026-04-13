import { NextResponse } from "next/server";
import satori, { type Font as SatoriFont } from "satori";
import { Resvg } from "@resvg/resvg-js";
import type { TextStyle } from "@/lib/post-data-schema";

const CANVAS_SIZE = 1080;

interface RenderTypographyRequest {
  headline?: string;
  subtitle?: string;
  cta?: string;
  textStyles?: {
    headline?: TextStyle;
    subtitle?: TextStyle;
    cta?: TextStyle;
  };
}

async function loadGoogleFontBuffer(family: string, weight = 400): Promise<ArrayBuffer | null> {
  try {
    const cssUrl = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@${weight}&display=swap`;
    const css = await fetch(cssUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (compatible; Satori/1.0)" },
    }).then((r) => r.text());

    const match = css.match(/src:\s*url\(([^)]+)\)/);
    if (!match) return null;

    return fetch(match[1]).then((r) => r.arrayBuffer());
  } catch {
    return null;
  }
}

function buildShadowFilter(id: string, style: TextStyle): string {
  if (!style.shadowColor && !style.shadowBlur && !style.shadowOffsetX && !style.shadowOffsetY) {
    return "";
  }
  const color = style.shadowColor ?? "rgba(0,0,0,0.6)";
  const blur = style.shadowBlur ?? 0;
  const dx = style.shadowOffsetX ?? 2;
  const dy = style.shadowOffsetY ?? 2;
  return `<filter id="${id}"><feDropShadow dx="${dx}" dy="${dy}" stdDeviation="${blur / 2}" flood-color="${color}" /></filter>`;
}

export async function POST(req: Request) {
  try {
    const body: RenderTypographyRequest = await req.json();
    const { headline, subtitle, cta, textStyles } = body;

    const layers = [
      { key: "headline" as const, text: headline, y: 180, defaultSize: 72, bold: true },
      { key: "subtitle" as const, text: subtitle, y: 680, defaultSize: 42, bold: false },
      { key: "cta" as const, text: cta, y: 880, defaultSize: 32, bold: false },
    ].filter((l): l is typeof l & { text: string } => typeof l.text === "string" && l.text.trim().length > 0);

    // Load fonts needed
    const fontFamilies = new Set<string>(["Inter"]);
    for (const layer of layers) {
      const style = textStyles?.[layer.key];
      if (style?.fontFamily) fontFamilies.add(style.fontFamily);
    }

    const fonts: SatoriFont[] = [];
    for (const family of fontFamilies) {
      const buffer = await loadGoogleFontBuffer(family, 400);
      if (buffer) fonts.push({ name: family, data: buffer, weight: 400, style: "normal" });
      const boldBuffer = await loadGoogleFontBuffer(family, 700);
      if (boldBuffer) fonts.push({ name: family, data: boldBuffer, weight: 700, style: "normal" });
    }

    // Build SVG filters for shadows
    const filters = layers
      .map((l) => {
        const style = textStyles?.[l.key] ?? {};
        return buildShadowFilter(`shadow-${l.key}`, style);
      })
      .filter(Boolean)
      .join("\n");

    // Build element descriptors for satori
    const elements = layers.map((layer) => {
      const style = textStyles?.[layer.key] ?? {};
      const fontFamily = style.fontFamily ?? "Inter";
      const fontSize = style.fontSize ?? layer.defaultSize;
      const fontWeight = style.fontWeight ?? (layer.bold ? "bold" : "normal");
      const fill = style.fill ?? "#ffffff";
      const strokeWidth = style.strokeWidth ?? 0;
      const stroke = style.stroke ?? "transparent";
      const charSpacing = style.charSpacing ?? 0;
      const opacity = style.opacity ?? 1;
      const textAlign = (style.textAlign ?? "center") as "left" | "center" | "right";
      const hasShadow =
        (style.shadowBlur ?? 0) > 0 ||
        (style.shadowOffsetX ?? 0) !== 0 ||
        (style.shadowOffsetY ?? 0) !== 0;

      return {
        key: layer.key,
        text: layer.text,
        y: layer.y,
        style: {
          fontFamily,
          fontSize,
          fontWeight: fontWeight as "normal" | "bold",
          fill,
          strokeWidth,
          stroke,
          charSpacing,
          opacity,
          textAlign,
          hasShadow,
        },
      };
    });

    // Satori renders JSX-like object tree to SVG
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const svg = await satori(
      {
        type: "div",
        props: {
          style: {
            display: "flex",
            flexDirection: "column",
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
            position: "relative",
            background: "transparent",
          },
          children: elements.map((el) => ({
            type: "div",
            props: {
              style: {
                position: "absolute",
                left: 0,
                right: 0,
                top: el.y - el.style.fontSize,
                display: "flex",
                justifyContent:
                  el.style.textAlign === "center"
                    ? "center"
                    : el.style.textAlign === "right"
                      ? "flex-end"
                      : "flex-start",
                padding: "0 90px",
                opacity: el.style.opacity,
                filter: el.style.hasShadow ? `url(#shadow-${el.key})` : undefined,
              },
              children: {
                type: "span",
                props: {
                  style: {
                    fontFamily: el.style.fontFamily,
                    fontSize: el.style.fontSize,
                    fontWeight: el.style.fontWeight,
                    color: el.style.fill,
                    WebkitTextStroke:
                      el.style.strokeWidth > 0
                        ? `${el.style.strokeWidth}px ${el.style.stroke}`
                        : undefined,
                    letterSpacing: el.style.charSpacing ? `${el.style.charSpacing / 100}em` : undefined,
                    textAlign: el.style.textAlign,
                    lineHeight: 1.2,
                    textShadow: el.style.hasShadow ? "inherit" : undefined,
                  },
                  children: el.text,
                },
              },
            },
          })),
        },
      } as Parameters<typeof satori>[0],
      {
        width: CANVAS_SIZE,
        height: CANVAS_SIZE,
        fonts,
      },
    );

    // Inject shadow filters into SVG defs
    const svgWithFilters = svg
      .replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`)
      .replace("</svg>", `<defs>${filters}</defs></svg>`);

    // Convert SVG → PNG via resvg
    const resvg = new Resvg(svgWithFilters, {
      fitTo: { mode: "width", value: CANVAS_SIZE },
    });
    const pngData = resvg.render();
    const pngBuffer = pngData.asPng();

    const base64 = Buffer.from(pngBuffer).toString("base64");
    return NextResponse.json({ png: `data:image/png;base64,${base64}` });
  } catch (error) {
    console.error("[render-typography]", error);
    return NextResponse.json({ error: (error as Error).message }, { status: 500 });
  }
}
