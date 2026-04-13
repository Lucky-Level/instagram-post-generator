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

function toSatoriWeight(w: number): 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 {
  const rounded = Math.round(w / 100) * 100;
  return Math.min(900, Math.max(100, rounded)) as 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900;
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

    // Fix 4: Parallel font loading with guard
    const fontLoadResults = await Promise.all(
      [...fontFamilies].flatMap((family) => [
        loadGoogleFontBuffer(family, 400).then((buf) =>
          buf ? { name: family, data: buf, weight: 400 as const, style: "normal" as const } : null
        ),
        loadGoogleFontBuffer(family, 700).then((buf) =>
          buf ? { name: family, data: buf, weight: 700 as const, style: "normal" as const } : null
        ),
      ])
    );

    const fonts: SatoriFont[] = fontLoadResults.filter(
      (f): f is NonNullable<typeof f> => f !== null
    );

    if (fonts.length === 0) {
      return NextResponse.json({ error: "Font loading failed" }, { status: 503 });
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

      // Fix 3: fontWeight coercion — schema is string, Satori needs number
      const parsedWeight = parseInt(style.fontWeight ?? "", 10);
      const fontWeightNum: 100 | 200 | 300 | 400 | 500 | 600 | 700 | 800 | 900 =
        !isNaN(parsedWeight)
          ? toSatoriWeight(parsedWeight)
          : layer.bold ? 700 : 400;

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
          fontWeight: fontWeightNum,
          fill,
          strokeWidth,
          stroke,
          charSpacing,
          opacity,
          textAlign,
          hasShadow,
          // Fix 2: lineHeight from TextStyle instead of hardcoded 1.2
          lineHeight: style.lineHeight ?? 1.2,
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
                    // Fix 2: use lineHeight from style
                    lineHeight: el.style.lineHeight,
                    // Fix 5: removed textShadow: "inherit" — Satori doesn't support it
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

    // Fix 1: Inject defs right after opening <svg ...> tag closes, guard against double xmlns
    const svgBase = svg.includes("xmlns=")
      ? svg
      : svg.replace("<svg", `<svg xmlns="http://www.w3.org/2000/svg"`);

    const svgWithFilters = filters
      ? svgBase.replace(/(<svg[^>]*>)/, `$1<defs>${filters}</defs>`)
      : svgBase;

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
