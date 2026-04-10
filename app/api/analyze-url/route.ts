import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

export const maxDuration = 30;

export async function POST(request: Request) {
  try {
    const { url } = await request.json();

    if (!url || typeof url !== "string") {
      return Response.json({ error: "URL é obrigatório" }, { status: 400 });
    }

    // 1. Fetch the page HTML
    const pageRes = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; PostAgent/1.0)",
      },
    });

    if (!pageRes.ok) {
      return Response.json(
        { error: `Não consegui acessar ${url}` },
        { status: 400 },
      );
    }

    const html = await pageRes.text();

    // 2. Extract key info from HTML
    const title = html.match(/<title[^>]*>([^<]*)<\/title>/i)?.[1] || "";
    const description =
      html.match(/<meta[^>]*name="description"[^>]*content="([^"]*)"/i)?.[1] ||
      "";
    const ogImage =
      html.match(
        /<meta[^>]*property="og:image"[^>]*content="([^"]*)"/i,
      )?.[1] || "";

    // Extract all image URLs
    const imgMatches = html.matchAll(/<img[^>]*src="([^"]*)"/gi);
    const images: string[] = [];
    for (const match of imgMatches) {
      let src = match[1];
      if (src.startsWith("/")) src = new URL(src, url).href;
      if (src.startsWith("http")) images.push(src);
    }

    // Extract CSS colors
    const colorMatches = html.matchAll(
      /#[0-9a-fA-F]{3,8}|rgb\([^)]+\)|rgba\([^)]+\)/g,
    );
    const colors = new Set<string>();
    for (const match of colorMatches) {
      colors.add(match[0]);
    }

    // Extract inline styles and CSS for brand colors
    const styleBlocks = html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi);
    for (const block of styleBlocks) {
      const blockColors = block[1].matchAll(
        /#[0-9a-fA-F]{3,8}|rgb\([^)]+\)/g,
      );
      for (const c of blockColors) colors.add(c[0]);
    }

    // 3. If there's an OG image, analyze it with Groq Vision
    let visualAnalysis = "";
    if (ogImage) {
      try {
        const completion = await groq.chat.completions.create({
          model: "meta-llama/llama-4-scout-17b-16e-instruct",
          messages: [
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: `Analyze this website's main image. Describe the visual style, brand identity, color palette, typography feel, and mood. Be specific about colors (hex if visible), composition, and design language. This will be used to replicate the brand's visual style.`,
                },
                {
                  type: "image_url",
                  image_url: { url: ogImage },
                },
              ],
            },
          ],
          max_tokens: 400,
        });
        visualAnalysis = completion.choices[0]?.message?.content || "";
      } catch (e) {
        console.log("Vision analysis failed:", e);
      }
    }

    // 4. Build comprehensive brand analysis
    const brandAnalysis = [
      `WEBSITE: ${url}`,
      `TITLE: ${title}`,
      `DESCRIPTION: ${description}`,
      `OG IMAGE: ${ogImage}`,
      `TOP IMAGES (${images.slice(0, 5).length}): ${images.slice(0, 5).join(", ")}`,
      `BRAND COLORS: ${[...colors].slice(0, 15).join(", ")}`,
      visualAnalysis
        ? `\nVISUAL ANALYSIS:\n${visualAnalysis}`
        : "",
    ]
      .filter(Boolean)
      .join("\n");

    // Also return the OG image as a reference image for Gemini
    const referenceImageUrl = ogImage || images[0] || "";

    return Response.json({
      analysis: brandAnalysis,
      referenceImageUrl,
      title,
      colors: [...colors].slice(0, 10),
    });
  } catch (err) {
    console.error("URL analysis error:", err);
    const message = err instanceof Error ? err.message : String(err);
    return Response.json({ error: message }, { status: 500 });
  }
}
