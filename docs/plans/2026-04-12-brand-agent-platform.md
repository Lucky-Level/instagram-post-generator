# Brand Agent Platform — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the Instagram post generator into a full Brand Agent platform with visual editor, multi-platform export, face preservation, reference image learning, and brand memory.

**Architecture:** 5 phases, each building on the previous. Phase 1 (Fabric.js editor) is the highest-impact feature — gives users Canva-like text editing on AI images. Phase 2 adds multi-platform sizing. Phase 3 integrates FLUX Kontext Pro for face preservation. Phase 4 builds the reference image study pipeline. Phase 5 closes the loop with brand memory/feedback.

**Tech Stack:** Next.js 16, React 19, Fabric.js 7, Satori + Sharp (server composition), FLUX Kontext Pro (Replicate API), Supabase (DB + Storage), @xyflow/react (canvas), Google Fonts API.

**Project Root:** `C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator\`

---

## Phase 1: Fabric.js Visual Editor (text on image)

### Why first
This is the single highest-impact feature. Users currently get an AI image and can't edit it. With this, they can add/edit text, change fonts, adjust colors — directly on the image. This is the bridge between "AI image" and "commercial post."

### Task 1.1: Install Fabric.js + create editor component shell

**Files:**
- Modify: `package.json` (add fabric dependency)
- Create: `components/post-editor.tsx` (main editor component)
- Create: `components/post-editor-toolbar.tsx` (font/color/style controls)

**Step 1: Install fabric**

```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator"
pnpm add fabric
```

**Step 2: Create the editor component shell**

Create `components/post-editor.tsx`:

```tsx
"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface PostEditorProps {
  imageUrl: string;
  width?: number;
  height?: number;
  onSave?: (dataUrl: string) => void;
  className?: string;
}

export function PostEditor({ imageUrl, width = 1080, height = 1080, onSave, className }: PostEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<any>(null);
  const [ready, setReady] = useState(false);

  // Initialize Fabric canvas
  useEffect(() => {
    if (!canvasRef.current) return;
    let cancelled = false;

    import("fabric").then(({ Canvas, FabricImage }) => {
      if (cancelled || !canvasRef.current) return;

      const canvas = new Canvas(canvasRef.current, {
        width,
        height,
        backgroundColor: "#000000",
        selection: true,
      });

      fabricRef.current = canvas;

      // Load background image
      FabricImage.fromURL(imageUrl, { crossOrigin: "anonymous" }).then((img) => {
        if (cancelled) return;
        img.scaleToWidth(width);
        img.scaleToHeight(height);
        canvas.backgroundImage = img;
        canvas.renderAll();
        setReady(true);
      });
    });

    return () => {
      cancelled = true;
      fabricRef.current?.dispose();
    };
  }, [imageUrl, width, height]);

  const exportImage = useCallback(() => {
    if (!fabricRef.current) return;
    const dataUrl = fabricRef.current.toDataURL({
      format: "png",
      quality: 1,
      multiplier: 1,
    });
    onSave?.(dataUrl);
    return dataUrl;
  }, [onSave]);

  return (
    <div className={cn("relative", className)}>
      <canvas ref={canvasRef} />
    </div>
  );
}
```

**Step 3: Commit**

```bash
git add components/post-editor.tsx package.json pnpm-lock.yaml
git commit -m "feat: add Fabric.js editor shell component"
```

---

### Task 1.2: Add text tool — add/edit/style text on canvas

**Files:**
- Modify: `components/post-editor.tsx` (add text methods)
- Create: `components/post-editor-toolbar.tsx` (controls UI)

**Step 1: Extend PostEditor with text methods**

Add to `components/post-editor.tsx` inside the component, after `exportImage`:

```tsx
const addText = useCallback((text = "Seu texto aqui") => {
  import("fabric").then(({ Textbox }) => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const textbox = new Textbox(text, {
      left: width / 2 - 150,
      top: height / 2 - 30,
      width: 300,
      fontSize: 48,
      fontFamily: "Inter",
      fill: "#FFFFFF",
      textAlign: "center",
      editable: true,
      // Shadow for readability
      shadow: new (require("fabric").Shadow)({
        color: "rgba(0,0,0,0.5)",
        blur: 8,
        offsetX: 0,
        offsetY: 2,
      }),
    });
    canvas.add(textbox);
    canvas.setActiveObject(textbox);
    canvas.renderAll();
  });
}, [width, height]);

const getActiveTextProps = useCallback(() => {
  const canvas = fabricRef.current;
  if (!canvas) return null;
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== "textbox") return null;
  return {
    fontFamily: obj.fontFamily,
    fontSize: obj.fontSize,
    fill: obj.fill,
    fontWeight: obj.fontWeight,
    fontStyle: obj.fontStyle,
    textAlign: obj.textAlign,
    text: obj.text,
  };
}, []);

const updateActiveText = useCallback((props: Record<string, any>) => {
  const canvas = fabricRef.current;
  if (!canvas) return;
  const obj = canvas.getActiveObject();
  if (!obj || obj.type !== "textbox") return;
  obj.set(props);
  canvas.renderAll();
}, []);

const deleteSelected = useCallback(() => {
  const canvas = fabricRef.current;
  if (!canvas) return;
  const obj = canvas.getActiveObject();
  if (obj) {
    canvas.remove(obj);
    canvas.renderAll();
  }
}, []);
```

Expose these via an imperative handle or pass them to the toolbar.

**Step 2: Create the toolbar**

Create `components/post-editor-toolbar.tsx` with controls for:
- Add text button
- Font family dropdown (top 16 Google Fonts)
- Font size slider (12-120)
- Color picker (react-colorful or native input[type=color])
- Bold/Italic/Align toggles
- Delete selected button
- Export button

**Step 3: Install react-colorful for the color picker**

```bash
pnpm add react-colorful
```

**Step 4: Commit**

```bash
git add components/post-editor.tsx components/post-editor-toolbar.tsx package.json pnpm-lock.yaml
git commit -m "feat: add text editing tools to post editor"
```

---

### Task 1.3: Google Fonts dynamic loading

**Files:**
- Create: `lib/google-fonts.ts` (font loader utility)
- Modify: `components/post-editor-toolbar.tsx` (font picker integration)

**Step 1: Create the font loader**

Create `lib/google-fonts.ts`:

```ts
const POPULAR_FONTS = [
  "Inter", "Poppins", "Roboto", "Space Grotesk", "DM Sans",
  "Playfair Display", "Lora", "Cormorant Garamond", "Merriweather",
  "Syne", "Bebas Neue", "Oswald", "Raleway", "Montserrat",
  "Nunito", "Work Sans",
];

const loadedFonts = new Set<string>();

export async function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);

  // Wait for font to actually load
  await document.fonts.load(`16px "${family}"`);
  loadedFonts.add(family);
}

export function getPopularFonts() {
  return POPULAR_FONTS;
}
```

**Step 2: Integrate into toolbar font picker**

When user selects a font:
1. Call `loadGoogleFont(family)`
2. After load, call `updateActiveText({ fontFamily: family })`
3. Call `fabric.util.clearFabricFontCache(family)` then `canvas.renderAll()`

**Step 3: Commit**

```bash
git add lib/google-fonts.ts components/post-editor-toolbar.tsx
git commit -m "feat: add Google Fonts dynamic loading for editor"
```

---

### Task 1.4: Integrate editor into chat flow (APP mode)

**Files:**
- Modify: `components/chat-panel.tsx` (add editor state + render after image)

**Step 1: Add editor toggle to generated images**

In `chat-panel.tsx`, where we render `chatImages[msg.id]`, add an "Edit" button per image. When clicked, opens the PostEditor in a modal/inline panel below the image.

```tsx
// After the image grid in the chat
{editingImage && (
  <div className="mt-2 rounded-xl border border-border overflow-hidden">
    <PostEditor
      imageUrl={editingImage.url}
      width={1080}
      height={1080}
      onSave={(dataUrl) => {
        // Replace the image in chatImages with the edited version
        // or download it
      }}
    />
    <PostEditorToolbar ... />
  </div>
)}
```

**Step 2: Add "Edit" and "Download" buttons on each generated image**

```tsx
<div className="absolute bottom-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
  <button onClick={() => setEditingImage(img)} className="...">Edit</button>
  <button onClick={() => downloadImage(img.url)} className="...">Download</button>
</div>
```

**Step 3: Commit**

```bash
git add components/chat-panel.tsx
git commit -m "feat: integrate visual editor into chat flow"
```

---

### Task 1.5: Integrate editor into Studio mode (canvas nodes)

**Files:**
- Modify: `components/nodes/image/transform.tsx` (add edit button that opens editor)

**Step 1: Add "Edit" button to image transform node**

When a generated image exists, show an "Edit" button. Clicking opens a dialog with the PostEditor.

**Step 2: Commit**

```bash
git add components/nodes/image/transform.tsx
git commit -m "feat: add visual editor to canvas image nodes"
```

---

## Phase 2: Multi-Platform Export

### Task 2.1: Platform selector component

**Files:**
- Create: `components/platform-selector.tsx` (grid of platform format options)
- Create: `lib/platform-formats.ts` (fetch/cache formats from Supabase)

**Step 1: Create platform formats fetcher**

Create `lib/platform-formats.ts`:

```ts
interface PlatformFormat {
  id: string;
  platform: string;
  format_name: string;
  width: number;
  height: number;
  aspect_ratio: string;
  notes: string | null;
}

let cachedFormats: PlatformFormat[] | null = null;

export async function getPlatformFormats(): Promise<PlatformFormat[]> {
  if (cachedFormats) return cachedFormats;
  const res = await fetch("/api/platform-formats");
  cachedFormats = await res.json();
  return cachedFormats!;
}

export function groupByPlatform(formats: PlatformFormat[]) {
  return formats.reduce((acc, f) => {
    (acc[f.platform] ??= []).push(f);
    return acc;
  }, {} as Record<string, PlatformFormat[]>);
}
```

**Step 2: Create API route**

Create `app/api/platform-formats/route.ts`:

```ts
import { createServerClient } from "@/lib/supabase";
import { NextResponse } from "next/server";

export async function GET() {
  const db = createServerClient();
  const { data } = await db.from("platform_formats").select("*").order("sort_order");
  return NextResponse.json(data || []);
}
```

**Step 3: Create platform selector UI**

Create `components/platform-selector.tsx`:
- Grid of platform icons (Instagram, LinkedIn, Twitter, etc.)
- Each platform expands to show its formats
- User can select multiple formats
- Shows preview of selected dimensions

**Step 4: Commit**

```bash
git add lib/platform-formats.ts app/api/platform-formats/route.ts components/platform-selector.tsx
git commit -m "feat: add platform format selector with Supabase data"
```

---

### Task 2.2: Server-side resize + composition with Satori + Sharp

**Files:**
- Create: `app/api/compose/route.ts` (resize + text overlay endpoint)
- Modify: `package.json` (add sharp, @resvg/resvg-js, satori)

**Step 1: Install dependencies**

```bash
pnpm add sharp satori @resvg/resvg-js
```

**Step 2: Create the compose API**

Create `app/api/compose/route.ts`:
- Accepts: base image URL, target width/height, text overlays (optional), brand kit
- Uses Sharp to resize/crop the base image to target dimensions
- Uses Satori to render text overlays as SVG (with proper fonts)
- Composites SVG on top of resized image using Sharp
- Returns final PNG as data URL or uploads to Supabase Storage

**Step 3: Commit**

```bash
git add app/api/compose/route.ts package.json pnpm-lock.yaml
git commit -m "feat: add server-side image composition with Satori + Sharp"
```

---

### Task 2.3: Multi-platform generation in chat pipeline

**Files:**
- Modify: `components/chat-panel.tsx` (add platform selection before generation)
- Modify: `app/api/chat/route.ts` (system prompt mentions platform options)

**Step 1: Add platform picker to confirmation flow**

When the agent asks "Posso criar?", show platform checkboxes alongside the "Let's go!" button. User picks which platforms they want.

**Step 2: After image generation, call /api/compose for each selected format**

In `createPipeline`, after generating the base image, loop through selected formats and call the compose endpoint:

```ts
for (const format of selectedFormats) {
  const composed = await fetch("/api/compose", {
    method: "POST",
    body: JSON.stringify({
      imageUrl: baseResult.url,
      width: format.width,
      height: format.height,
      // text overlays from post-data
    }),
  });
  // Add each variant to chatImages
}
```

**Step 3: Show all variants in a grid with platform labels**

**Step 4: Commit**

```bash
git add components/chat-panel.tsx app/api/chat/route.ts
git commit -m "feat: multi-platform generation with format selection"
```

---

## Phase 3: FLUX Kontext Pro (Face Preservation)

### Task 3.1: Replicate API integration

**Files:**
- Modify: `package.json` (add replicate)
- Create: `app/actions/image/flux-kontext.ts` (FLUX Kontext action)
- Modify: `.env.local` (add REPLICATE_API_TOKEN)

**Step 1: Install replicate SDK**

```bash
pnpm add replicate
```

**Step 2: Create FLUX Kontext action**

Create `app/actions/image/flux-kontext.ts`:

```ts
"use server";

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function generateWithFacePreservation({
  prompt,
  referenceImageUrl,
}: {
  prompt: string;
  referenceImageUrl: string;
}): Promise<{ url: string } | { error: string }> {
  try {
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          image: referenceImageUrl,
          aspect_ratio: "1:1",
          output_format: "png",
          safety_tolerance: 2,
        },
      }
    );
    // output is a URL string or ReadableStream
    const url = typeof output === "string" ? output : String(output);
    return { url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
```

**Step 3: Add REPLICATE_API_TOKEN to .env.local and Vercel**

```bash
# .env.local
REPLICATE_API_TOKEN=r8_...

# Vercel
echo -n 'r8_...' | vercel env add REPLICATE_API_TOKEN production
```

**Step 4: Commit**

```bash
git add app/actions/image/flux-kontext.ts package.json pnpm-lock.yaml
git commit -m "feat: add FLUX Kontext Pro integration for face preservation"
```

---

### Task 3.2: Smart provider routing (face detected → FLUX Kontext)

**Files:**
- Modify: `app/actions/image/create.ts` (add face detection routing)

**Step 1: Update generateImageAction**

In `create.ts`, add logic:
- If reference images are provided AND contain a face → route to FLUX Kontext Pro
- If no face or no reference → use existing Gemini/FLUX/Pollinations fallback
- Face detection: use the existing `/api/analyze-image` endpoint to check for faces

```ts
// At the top of generateImageAction:
if (referenceImages?.length && process.env.REPLICATE_API_TOKEN) {
  // Upload reference to Supabase Storage for a public URL
  // Call FLUX Kontext Pro
  const result = await generateWithFacePreservation({
    prompt,
    referenceImageUrl: publicUrl,
  });
  if (!("error" in result)) return { ...result, type: "image/png", description: prompt };
  // If FLUX Kontext fails, fall through to Gemini
}
```

**Step 2: Commit**

```bash
git add app/actions/image/create.ts
git commit -m "feat: smart routing — face reference images use FLUX Kontext Pro"
```

---

## Phase 4: Reference Image Study Pipeline

### Task 4.1: AI reference analyzer

**Files:**
- Create: `app/api/analyze-reference/route.ts` (deep analysis endpoint)
- Modify: `app/api/analyze-image/route.ts` (extend with structured output)

**Step 1: Create deep reference analyzer**

Create `app/api/analyze-reference/route.ts`:
- Accepts: image URL or base64
- Uses Gemini Vision to extract:
  - Dominant colors (hex array)
  - Font styles detected (serif/sans-serif/display)
  - Layout structure (where is text, where is the subject)
  - Visual style (minimalist, bold, vintage, etc.)
  - Mood/energy
  - Subject position (center, rule of thirds, etc.)
- Returns structured JSON

**Step 2: Commit**

```bash
git add app/api/analyze-reference/route.ts
git commit -m "feat: add deep reference image analyzer with structured output"
```

---

### Task 4.2: Auto-save analyzed references to brand agent

**Files:**
- Modify: `components/chat-panel.tsx` (after upload, analyze and save to brand_references)

**Step 1: After uploading a reference image in chat**

When user uploads an image:
1. Call `/api/analyze-reference` for deep analysis
2. Save to `brand_references` table with extracted data
3. Include analysis in chat context for the LLM
4. Show brief analysis summary in chat ("Detectei: estilo minimalista, paleta fria, fonte sans-serif")

**Step 2: Update chat system prompt**

In `/api/chat/route.ts`, when building brand context, also fetch recent references:
```ts
const { data: refs } = await db
  .from("brand_references")
  .select("analysis, extracted_colors, extracted_layout")
  .eq("agent_id", agentId)
  .order("created_at", { ascending: false })
  .limit(5);
```

Inject into system prompt so the agent knows the brand's visual patterns.

**Step 3: Commit**

```bash
git add components/chat-panel.tsx app/api/chat/route.ts
git commit -m "feat: auto-analyze and save reference images to brand agent"
```

---

## Phase 5: Brand Memory + Feedback Loop

### Task 5.1: Feedback buttons on generated assets

**Files:**
- Modify: `components/chat-panel.tsx` (add thumbs up/down on images)

**Step 1: Add feedback UI**

Below each generated image, add subtle feedback buttons:
- Thumbs up (positive) → saves to brand_memory + creative_assets.feedback
- Thumbs down (negative) → saves + asks "O que nao gostou?"
- Optional text comment

**Step 2: Create feedback API**

Create `app/api/feedback/route.ts`:
- Accepts: agent_id, asset_url, sentiment, comment
- Saves to `brand_memory` table with type "feedback"
- If negative, also creates an "anti_pattern" entry

**Step 3: Commit**

```bash
git add components/chat-panel.tsx app/api/feedback/route.ts
git commit -m "feat: add feedback buttons on generated assets"
```

---

### Task 5.2: Learning from feedback — inject into system prompt

**Files:**
- Modify: `app/api/chat/route.ts` (load brand_memory into context)

**Step 1: Load recent feedback and learned rules**

In `buildSystemPrompt`, after loading the agent, also load memory:

```ts
const { data: memories } = await db
  .from("brand_memory")
  .select("type, content, weight")
  .eq("agent_id", agentId)
  .order("weight", { ascending: false })
  .limit(10);
```

Inject as rules:
```
## LEARNED PREFERENCES
- User likes: [from positive feedback]
- User dislikes: [from negative feedback]
- Rules: [from learned_rules]
```

**Step 2: Commit**

```bash
git add app/api/chat/route.ts
git commit -m "feat: inject brand memory into agent system prompt"
```

---

### Task 5.3: Save created assets to creative_assets table

**Files:**
- Modify: `components/chat-panel.tsx` (save after generation)
- Create: `app/api/creative-assets/route.ts` (CRUD for assets)

**Step 1: After successful image generation in createPipeline**

Save each generated image to `creative_assets`:

```ts
await fetch("/api/creative-assets", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    agent_id: agentId,
    platform: "instagram_feed_square", // or selected platform
    width: 1080,
    height: 1080,
    aspect_ratio: "1:1",
    base_image_url: result.url,
    caption: postData.legenda,
    hashtags: postData.hashtags,
    cta: postData.cta,
    image_prompt: postData.imagePrompt,
  }),
});
```

**Step 2: Commit**

```bash
git add components/chat-panel.tsx app/api/creative-assets/route.ts
git commit -m "feat: persist generated assets to Supabase"
```

---

### Task 5.4: Creative sessions tracking

**Files:**
- Modify: `components/chat-panel.tsx` (create session on first message)
- Create: `app/api/creative-sessions/route.ts` (session management)

**Step 1: On first message in a conversation**

Create a creative_session in Supabase:
```ts
const session = await fetch("/api/creative-sessions", {
  method: "POST",
  body: JSON.stringify({
    agent_id: agentId,
    type: "post_single",
    brief: firstMessage,
    platforms: ["instagram_feed_square"],
    complexity_layer: fullscreen ? 1 : 3,
  }),
});
```

Link all generated assets to this session.

**Step 2: Update chat_history in session on each message**

**Step 3: Commit**

```bash
git add components/chat-panel.tsx app/api/creative-sessions/route.ts
git commit -m "feat: track creative sessions in Supabase"
```

---

## Execution Order Summary

| # | Task | Impact | Effort |
|---|------|--------|--------|
| 1.1 | Fabric.js shell | Foundation | 30min |
| 1.2 | Text tools | High — users can add/edit text | 1h |
| 1.3 | Google Fonts loading | Medium — font variety | 30min |
| 1.4 | Editor in chat (APP mode) | High — main UX flow | 1h |
| 1.5 | Editor in Studio nodes | Medium — power users | 30min |
| 2.1 | Platform selector | Foundation | 30min |
| 2.2 | Satori + Sharp compose | High — server-side quality | 1h |
| 2.3 | Multi-platform in chat | High — key differentiator | 1h |
| 3.1 | Replicate + FLUX Kontext | High — face preservation | 30min |
| 3.2 | Smart provider routing | High — automatic face detection | 30min |
| 4.1 | Reference analyzer | Medium — brand learning | 1h |
| 4.2 | Auto-save references | Medium — continuity | 30min |
| 5.1 | Feedback buttons | Medium — learning loop | 30min |
| 5.2 | Memory in prompt | High — agent improves | 30min |
| 5.3 | Save assets | Medium — history | 30min |
| 5.4 | Session tracking | Medium — organization | 30min |

**Total: ~16 tasks, ~10 hours estimated**

---

## Dependencies

```
Phase 1 (Fabric.js) → no dependencies, start immediately
Phase 2 (Multi-platform) → depends on Phase 1 (editor can render at different sizes)
Phase 3 (FLUX Kontext) → no dependency on Phase 1/2, can run in parallel
Phase 4 (References) → depends on Phase 3 (face-aware routing)
Phase 5 (Memory) → depends on Phase 4 (references feed memory)
```

**Optimal parallel execution:**
- Phase 1 + Phase 3 in parallel
- Phase 2 after Phase 1
- Phase 4 after Phase 3
- Phase 5 after Phase 4
