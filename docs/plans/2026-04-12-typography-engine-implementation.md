# Typography Engine + Creative Director AI — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transformar o editor em uma ferramenta de criativos comerciais onde o agente age como diretor de arte — sugerindo fontes display, efeitos tipograficos, posicao de logo e aprendendo com o DNA visual da marca.

**Architecture:** Cada task e independente. A cadeia de dados flui assim:
`brand_kit + referencias analisadas → buildSystemPrompt → agente sugere textStyles + logo → post-data → initWithTextLayers aplica tudo no Fabric.js`

**Tech Stack:** Fabric.js 7, Google Fonts API, FontFace API, Supabase Storage, Groq Vision (Llama 4 Scout), Next.js App Router

---

## Task 1: Google Fonts expandido + picker categorizado

**Files:**
- Modify: `lib/google-fonts.ts` (reescrever completo)
- Modify: `components/post-editor-toolbar.tsx:88-103` (picker)

**Step 1: Reescrever `lib/google-fonts.ts`**

```ts
export const FONT_CATEGORIES: Record<string, string[]> = {
  "Sans-serif": [
    "Inter", "Roboto", "Open Sans", "Poppins", "Montserrat",
    "DM Sans", "Space Grotesk", "Nunito", "Raleway", "Rubik",
    "Barlow", "Outfit", "Plus Jakarta Sans",
  ],
  "Serif": [
    "Playfair Display", "Lora", "Merriweather", "Cormorant Garamond",
    "EB Garamond", "DM Serif Display",
  ],
  "Display": [
    "Bebas Neue", "Anton", "Oswald", "Archivo Black", "Black Ops One",
    "Dela Gothic One", "Boogaloo", "Righteous", "Baloo 2",
    "Fredoka", "Alfa Slab One", "Permanent Marker",
  ],
  "Script": [
    "Pacifico", "Lobster", "Dancing Script", "Satisfy", "Caveat",
    "Great Vibes",
  ],
  "Monospace": [
    "JetBrains Mono", "Fira Code", "Source Code Pro",
  ],
};

const loadedFonts = new Set<string>();

export function getFontCategories(): string[] {
  return Object.keys(FONT_CATEGORIES);
}

export function getFontsByCategory(cat: string): string[] {
  return FONT_CATEGORIES[cat] ?? [];
}

export function getAllFonts(): string[] {
  return Object.values(FONT_CATEGORIES).flat();
}

// Manter compatibilidade com chamadas existentes
export function getPopularFonts(): string[] {
  return getAllFonts();
}

export async function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;700&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${family}"`);
    await document.fonts.ready;
  } catch {
    // Font load failed silently
  }

  loadedFonts.add(family);

  try {
    const fabric = await import("fabric");
    if (fabric.cache && typeof fabric.cache.clearFontCache === "function") {
      fabric.cache.clearFontCache(family);
    }
  } catch {
    // Fabric not loaded yet
  }
}
```

**Step 2: Substituir o dropdown flat no toolbar pelo categorizado**

Em `components/post-editor-toolbar.tsx`, substituir:
```tsx
// Antes: fonts.map(font => ...)
// Depois:
import { getFontCategories, getFontsByCategory } from "@/lib/google-fonts";

// Dentro do useEffect preload:
const allFonts = getFontCategories().flatMap(cat => getFontsByCategory(cat));
await Promise.all(allFonts.map((f) => loadGoogleFont(f)));

// Dentro do PopoverContent:
<PopoverContent className="w-56 max-h-72 overflow-y-auto p-1" align="start">
  {getFontCategories().map((cat) => (
    <div key={cat}>
      <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {cat}
      </p>
      {getFontsByCategory(cat).map((font) => (
        <button
          key={font}
          onClick={() => update({ fontFamily: font })}
          className={cn(
            "w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary transition-colors",
            activeTextProps?.fontFamily === font && "bg-secondary font-semibold",
          )}
          style={fontsLoaded ? { fontFamily: `"${font}", sans-serif` } : undefined}
        >
          {font}
        </button>
      ))}
    </div>
  ))}
</PopoverContent>
```

**Step 3: Testar no browser**
- Abrir o editor, clicar no dropdown de fonte
- Verificar que aparecem as categorias com separadores
- Verificar que as fontes renderizam na propria tipografia

**Step 4: Commit**
```bash
git add lib/google-fonts.ts components/post-editor-toolbar.tsx
git commit -m "feat: expand font library to 55 fonts with category groups in picker"
```

---

## Task 2: Novos campos tipograficos em ActiveTextProps

**Files:**
- Modify: `components/post-editor.tsx:13-28` (interfaces + getActiveTextProps + updateActiveText)

**Step 1: Expandir interface `ActiveTextProps`**

```ts
export interface ActiveTextProps {
  // existentes
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  // novos
  strokeWidth: number;
  stroke: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  charSpacing: number;
  lineHeight: number;
  opacity: number;
}
```

**Step 2: Atualizar `DEFAULT_TEXT_PROPS`**

```ts
const DEFAULT_TEXT_PROPS: ActiveTextProps = {
  fontFamily: "Inter",
  fontSize: 48,
  fill: "#ffffff",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "center",
  strokeWidth: 0,
  stroke: "#000000",
  shadowColor: "rgba(0,0,0,0.6)",
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  charSpacing: 0,
  lineHeight: 1.16,
  opacity: 1,
};
```

**Step 3: Atualizar `getActiveTextProps`**

```ts
const getActiveTextProps = useCallback((obj: any): ActiveTextProps => {
  const shadow = obj.shadow;
  return {
    fontFamily: obj.fontFamily || "Inter",
    fontSize: Math.round(obj.fontSize || 48),
    fill: (obj.fill as string) || "#ffffff",
    fontWeight: obj.fontWeight || "normal",
    fontStyle: obj.fontStyle || "normal",
    textAlign: obj.textAlign || "center",
    strokeWidth: obj.strokeWidth ?? 0,
    stroke: (obj.stroke as string) || "#000000",
    shadowColor: shadow?.color || "rgba(0,0,0,0)",
    shadowBlur: shadow?.blur ?? 0,
    shadowOffsetX: shadow?.offsetX ?? 0,
    shadowOffsetY: shadow?.offsetY ?? 0,
    charSpacing: obj.charSpacing ?? 0,
    lineHeight: obj.lineHeight ?? 1.16,
    opacity: obj.opacity ?? 1,
  };
}, []);
```

**Step 4: Atualizar `updateActiveText`**

Substituir `active.set(props)` pelo handling manual dos novos campos:

```ts
updateActiveText: async (props: Partial<ActiveTextProps>) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;
  const active = canvas.getActiveObject();
  if (!active || active.type !== "textbox") return;

  if (props.fontFamily) await loadGoogleFont(props.fontFamily);

  // Props diretos do Fabric
  const directProps = ["fontFamily","fontSize","fill","fontWeight","fontStyle","textAlign","strokeWidth","stroke","charSpacing","lineHeight","opacity"] as const;
  for (const key of directProps) {
    if (props[key] !== undefined) active.set(key as any, props[key]);
  }

  // Shadow: precisa de objeto fabric.Shadow
  if (
    props.shadowColor !== undefined ||
    props.shadowBlur !== undefined ||
    props.shadowOffsetX !== undefined ||
    props.shadowOffsetY !== undefined
  ) {
    const fabric = await import("fabric");
    const current = active.shadow as any;
    active.set("shadow", new fabric.Shadow({
      color: props.shadowColor ?? current?.color ?? "rgba(0,0,0,0)",
      blur: props.shadowBlur ?? current?.blur ?? 0,
      offsetX: props.shadowOffsetX ?? current?.offsetX ?? 0,
      offsetY: props.shadowOffsetY ?? current?.offsetY ?? 0,
    }));
  }

  canvas.renderAll();
  onSelectionChange?.(getActiveTextProps(active));
},
```

**Step 5: Commit**
```bash
git add components/post-editor.tsx
git commit -m "feat: expand ActiveTextProps with stroke, shadow, charSpacing, lineHeight, opacity"
```

---

## Task 3: UI de efeitos tipograficos na toolbar

**Files:**
- Modify: `components/post-editor-toolbar.tsx` (adicionar secao Efeitos)

**Step 1: Adicionar imports de icones necessarios**

```tsx
import {
  // existentes
  AlignCenterIcon, AlignLeftIcon, AlignRightIcon,
  BoldIcon, DownloadIcon, ItalicIcon, MinusIcon, PlusIcon, Trash2Icon, TypeIcon,
  // novos
  ShadowIcon, // nao existe no lucide — usar CircleDotIcon como placeholder
  UnderlineIcon, // para stroke toggle
  SpaceIcon,    // para letter-spacing
} from "lucide-react";
```

Lucide nao tem icones de shadow/stroke. Usar textos curtos como labels: "O" (outline), "S" (shadow), "Aa" (spacing).

**Step 2: Adicionar estado local para controle de toggles**

```tsx
const hasStroke = (activeTextProps?.strokeWidth ?? 0) > 0;
const hasShadow = (activeTextProps?.shadowBlur ?? 0) > 0 ||
                  (activeTextProps?.shadowOffsetX ?? 0) !== 0 ||
                  (activeTextProps?.shadowOffsetY ?? 0) !== 0;
```

**Step 3: Adicionar secao de efeitos apos os botoes de alinhamento**

```tsx
<div className="mx-0.5 h-6 w-px bg-border" />

{/* Outline toggle */}
<Popover>
  <PopoverTrigger asChild>
    <button
      disabled={!hasSelection}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-40",
        hasStroke ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"
      )}
      title="Contorno (outline)"
    >
      O
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-52 p-3 space-y-3" align="start">
    <p className="text-xs font-medium">Contorno</p>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16">Espessura</span>
      <input
        type="range" min={0} max={20} step={1}
        value={activeTextProps?.strokeWidth ?? 0}
        onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
        className="flex-1"
      />
      <span className="text-xs w-6 text-right">{activeTextProps?.strokeWidth ?? 0}</span>
    </div>
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16">Cor</span>
      <HexColorPicker
        color={activeTextProps?.stroke ?? "#000000"}
        onChange={(color) => update({ stroke: color })}
        style={{ width: "100%", height: 80 }}
      />
    </div>
  </PopoverContent>
</Popover>

{/* Shadow toggle */}
<Popover>
  <PopoverTrigger asChild>
    <button
      disabled={!hasSelection}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-40",
        hasShadow ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"
      )}
      title="Sombra"
    >
      S
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-52 p-3 space-y-3" align="start">
    <p className="text-xs font-medium">Sombra</p>
    {[
      { label: "Blur", key: "shadowBlur" as const, min: 0, max: 30 },
      { label: "Offset X", key: "shadowOffsetX" as const, min: -20, max: 20 },
      { label: "Offset Y", key: "shadowOffsetY" as const, min: -20, max: 20 },
    ].map(({ label, key, min, max }) => (
      <div key={key} className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground w-16">{label}</span>
        <input
          type="range" min={min} max={max} step={1}
          value={activeTextProps?.[key] ?? 0}
          onChange={(e) => update({ [key]: Number(e.target.value) })}
          className="flex-1"
        />
        <span className="text-xs w-6 text-right">{activeTextProps?.[key] ?? 0}</span>
      </div>
    ))}
    <div className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground w-16">Cor</span>
      <HexColorPicker
        color={activeTextProps?.shadowColor ?? "rgba(0,0,0,0.6)"}
        onChange={(color) => update({ shadowColor: color })}
        style={{ width: "100%", height: 80 }}
      />
    </div>
  </PopoverContent>
</Popover>

{/* Letter-spacing */}
<Popover>
  <PopoverTrigger asChild>
    <button
      disabled={!hasSelection}
      className="flex size-8 items-center justify-center rounded-md border border-transparent text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
      title="Espacamento de letras"
    >
      Aa
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-48 p-3 space-y-2" align="start">
    <p className="text-xs font-medium">Espacamento</p>
    <div className="flex items-center gap-2">
      <input
        type="range" min={-200} max={800} step={10}
        value={activeTextProps?.charSpacing ?? 0}
        onChange={(e) => update({ charSpacing: Number(e.target.value) })}
        className="flex-1"
      />
      <span className="text-xs w-8 text-right">{activeTextProps?.charSpacing ?? 0}</span>
    </div>
    <p className="text-xs font-medium mt-2">Opacidade</p>
    <div className="flex items-center gap-2">
      <input
        type="range" min={0} max={1} step={0.05}
        value={activeTextProps?.opacity ?? 1}
        onChange={(e) => update({ opacity: Number(e.target.value) })}
        className="flex-1"
      />
      <span className="text-xs w-8 text-right">{Math.round((activeTextProps?.opacity ?? 1) * 100)}%</span>
    </div>
  </PopoverContent>
</Popover>
```

**Step 4: Testar no browser**
- Selecionar um textbox
- Ativar outline, ajustar espessura e cor
- Ativar sombra, testar blur=0 (sombra dura) vs blur=20 (difusa)
- Ajustar letter-spacing: negativo comprime, positivo espaca

**Step 5: Commit**
```bash
git add components/post-editor-toolbar.tsx
git commit -m "feat: add stroke, shadow, letter-spacing, opacity controls to editor toolbar"
```

---

## Task 4: Presets de estilo tipografico

**Files:**
- Create: `lib/text-style-presets.ts`
- Modify: `components/post-editor-toolbar.tsx` (adicionar botao Estilos)

**Step 1: Criar `lib/text-style-presets.ts`**

```ts
import type { ActiveTextProps } from "@/components/post-editor";

export interface TextStylePreset {
  name: string;
  style: Partial<ActiveTextProps>;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    name: "Impact",
    style: {
      fontFamily: "Bebas Neue",
      fontSize: 96,
      fontWeight: "normal",
      fill: "#FFFFFF",
      stroke: "#000000",
      strokeWidth: 3,
      shadowColor: "rgba(0,0,0,0.9)",
      shadowBlur: 0,
      shadowOffsetX: 5,
      shadowOffsetY: 5,
      charSpacing: -20,
      opacity: 1,
    },
  },
  {
    name: "Elegante",
    style: {
      fontFamily: "Playfair Display",
      fontSize: 72,
      fontWeight: "bold",
      fill: "#FFFFFF",
      stroke: "",
      strokeWidth: 0,
      shadowColor: "rgba(0,0,0,0.5)",
      shadowBlur: 12,
      shadowOffsetX: 0,
      shadowOffsetY: 4,
      charSpacing: 50,
      opacity: 1,
    },
  },
  {
    name: "Moderno",
    style: {
      fontFamily: "Space Grotesk",
      fontSize: 64,
      fontWeight: "bold",
      fill: "#FFFFFF",
      stroke: "",
      strokeWidth: 0,
      shadowColor: "rgba(0,0,0,0)",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      charSpacing: -10,
      opacity: 1,
    },
  },
  {
    name: "Vintage",
    style: {
      fontFamily: "Archivo Black",
      fontSize: 80,
      fontWeight: "normal",
      fill: "#FFFFFF",
      stroke: "#FFFFFF",
      strokeWidth: 2,
      shadowColor: "rgba(0,0,0,0.9)",
      shadowBlur: 0,
      shadowOffsetX: 6,
      shadowOffsetY: 6,
      charSpacing: 100,
      opacity: 1,
    },
  },
  {
    name: "Script",
    style: {
      fontFamily: "Pacifico",
      fontSize: 80,
      fontWeight: "normal",
      fill: "#FFFFFF",
      stroke: "",
      strokeWidth: 0,
      shadowColor: "rgba(0,0,0,0.6)",
      shadowBlur: 8,
      shadowOffsetX: 2,
      shadowOffsetY: 4,
      charSpacing: 0,
      opacity: 1,
    },
  },
  {
    name: "Minimal",
    style: {
      fontFamily: "Inter",
      fontSize: 56,
      fontWeight: "normal",
      fill: "#FFFFFF",
      stroke: "",
      strokeWidth: 0,
      shadowColor: "rgba(0,0,0,0)",
      shadowBlur: 0,
      shadowOffsetX: 0,
      shadowOffsetY: 0,
      charSpacing: 200,
      opacity: 0.9,
    },
  },
];
```

**Step 2: Adicionar botao Estilos na toolbar (apos a secao de efeitos)**

```tsx
import { SparklesIcon } from "lucide-react";
import { TEXT_STYLE_PRESETS } from "@/lib/text-style-presets";

// Na toolbar, apos os efeitos:
<div className="mx-0.5 h-6 w-px bg-border" />

<Popover>
  <PopoverTrigger asChild>
    <button
      disabled={!hasSelection}
      className="flex h-8 items-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40"
      title="Estilos prontos"
    >
      <SparklesIcon className="size-3.5" />
      Estilos
    </button>
  </PopoverTrigger>
  <PopoverContent className="w-56 p-2" align="start">
    <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Estilos prontos
    </p>
    <div className="space-y-1">
      {TEXT_STYLE_PRESETS.map((preset) => (
        <button
          key={preset.name}
          onClick={async () => {
            if (preset.style.fontFamily) {
              await loadGoogleFont(preset.style.fontFamily);
            }
            update(preset.style);
          }}
          className="w-full rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-secondary"
        >
          <span
            className="block text-sm leading-tight"
            style={{
              fontFamily: `"${preset.style.fontFamily}", sans-serif`,
              fontWeight: preset.style.fontWeight || "normal",
            }}
          >
            {preset.name}
          </span>
        </button>
      ))}
    </div>
  </PopoverContent>
</Popover>
```

**Step 3: Testar**
- Selecionar textbox, clicar em Estilos, aplicar "Impact"
- Verificar que fonte, stroke, shadow e charSpacing mudam juntos
- Testar "Elegante" — deve usar Playfair Display com sombra suave

**Step 4: Commit**
```bash
git add lib/text-style-presets.ts components/post-editor-toolbar.tsx
git commit -m "feat: text style presets (Impact, Elegante, Moderno, Vintage, Script, Minimal)"
```

---

## Task 5: Upload de fonte customizada no editor

**Files:**
- Create: `app/api/upload-font/route.ts`
- Modify: `components/post-editor-toolbar.tsx` (botao + logica de upload)
- Modify: `lib/google-fonts.ts` (suporte a fontes customizadas em memoria)

**Step 1: Criar `app/api/upload-font/route.ts`**

```ts
import { createAdminClient } from "@/lib/supabase-server";
import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  const agentId = formData.get("agentId") as string | null;

  if (!file) {
    return NextResponse.json({ error: "No file" }, { status: 400 });
  }

  // Sanitize font name from filename (remove extension, spaces -> hyphens)
  const baseName = file.name.replace(/\.(ttf|woff|woff2)$/i, "");
  const fontFamily = baseName.replace(/[-_]/g, " ").replace(/\b\w/g, c => c.toUpperCase());

  const admin = createAdminClient();
  const path = agentId
    ? `fonts/${agentId}/${file.name}`
    : `fonts/global/${file.name}`;

  const { error: uploadError } = await admin.storage
    .from("brand-assets")
    .upload(path, file, { upsert: true, contentType: file.type });

  if (uploadError) {
    return NextResponse.json({ error: uploadError.message }, { status: 500 });
  }

  const { data: urlData } = admin.storage.from("brand-assets").getPublicUrl(path);

  // Save to font_library if agentId provided
  if (agentId) {
    await admin.from("font_library").upsert({
      agent_id: agentId,
      family: fontFamily,
      source: "upload",
      category: "custom",
      is_favorite: true,
    });
  }

  return NextResponse.json({ url: urlData.publicUrl, fontFamily });
}
```

**Step 2: Adicionar botao e logica de upload na toolbar**

```tsx
// Props da toolbar precisam receber agentId
interface PostEditorToolbarProps {
  editorRef: React.RefObject<PostEditorHandle | null>;
  activeTextProps: ActiveTextProps | null;
  agentId?: string;
}

// Estado para fontes customizadas carregadas nessa sessao
const [customFonts, setCustomFonts] = useState<string[]>([]);
const fontUploadRef = useRef<HTMLInputElement>(null);

const handleFontUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
  const file = e.target.files?.[0];
  if (!file) return;

  const formData = new FormData();
  formData.append("file", file);
  if (agentId) formData.append("agentId", agentId);

  const res = await fetch("/api/upload-font", { method: "POST", body: formData });
  if (!res.ok) return;

  const { url, fontFamily } = await res.json();

  // Registrar no browser via FontFace API
  const font = new FontFace(fontFamily, `url(${url})`);
  await font.load();
  document.fonts.add(font);

  setCustomFonts(prev => [...prev, fontFamily]);
  e.target.value = "";
};

// Botao na toolbar (antes do Download):
<>
  <input
    ref={fontUploadRef}
    type="file"
    accept=".ttf,.woff,.woff2"
    className="hidden"
    onChange={handleFontUpload}
  />
  <ToolbarButton
    onClick={() => fontUploadRef.current?.click()}
    title="Upload fonte customizada"
  >
    <UploadIcon className="size-4" />
  </ToolbarButton>
</>
```

**Step 3: Adicionar "Minhas Fontes" ao topo do dropdown de fonte**

```tsx
// No PopoverContent do picker de fontes, antes das categorias:
{customFonts.length > 0 && (
  <div>
    <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
      Minhas Fontes
    </p>
    {customFonts.map((font) => (
      <button
        key={font}
        onClick={() => update({ fontFamily: font })}
        className={cn(
          "w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary transition-colors",
          activeTextProps?.fontFamily === font && "bg-secondary font-semibold",
        )}
        style={{ fontFamily: `"${font}", sans-serif` }}
      >
        {font}
      </button>
    ))}
    <div className="my-1 border-t border-border" />
  </div>
)}
```

**Step 4: Passar agentId da modal para a toolbar**

Em `components/post-editor-modal.tsx`:
```tsx
// Props adicionais:
interface PostEditorModalProps {
  // ... existentes
  agentId?: string;
}

// Passar para toolbar:
<PostEditorToolbar editorRef={editorRef} activeTextProps={activeTextProps} agentId={agentId} />
```

Em `components/chat-panel.tsx`, no PostEditorModal, passar `agentId={agentId}`.

**Step 5: Testar**
- Clicar no botao upload na toolbar
- Selecionar um .ttf qualquer
- Verificar que a fonte aparece em "Minhas Fontes"
- Aplicar a fonte em um textbox

**Step 6: Commit**
```bash
git add app/api/upload-font/route.ts components/post-editor-toolbar.tsx components/post-editor-modal.tsx
git commit -m "feat: custom font upload in editor — FontFace API + Supabase Storage + font_library"
```

---

## Task 6: Agente sugere textStyles + logo no post-data

**Files:**
- Modify: `app/api/chat/route.ts` (BASE_SYSTEM_PROMPT + buildSystemPrompt)
- Modify: `components/chat-panel.tsx` (GeneratedImage + addChatImage + editorImage)
- Modify: `components/post-editor-modal.tsx` (props logo + textStyles)
- Modify: `components/post-editor.tsx` (initWithTextLayers aplica tudo)

**Step 1: Atualizar `BASE_SYSTEM_PROMPT` em `app/api/chat/route.ts`**

Substituir a secao `## FORMATO DO JSON` por:

```
## FORMATO DO JSON

<post-data>
{
  "headline": "texto principal do post (máx 8 palavras)",
  "subtitle": "subtítulo ou complemento (opcional, máx 12 palavras)",
  "cta": "call to action direto (máx 5 palavras)",
  "legenda": "hook forte + corpo + fechamento (2-4 linhas para o caption do Instagram)",
  "hashtags": ["3-5 hashtags estratégicas"],
  "imagePrompt": "prompt técnico de 200-400 palavras em inglês descrevendo APENAS o fundo visual, SEM qualquer texto",
  "textStyles": {
    "headline": {
      "fontFamily": "Bebas Neue",
      "strokeWidth": 3,
      "stroke": "#000000",
      "shadowBlur": 0,
      "shadowOffsetX": 5,
      "shadowOffsetY": 5,
      "charSpacing": -20
    },
    "subtitle": {
      "fontFamily": "Inter",
      "charSpacing": 50
    }
  },
  "logo": {
    "x": 60,
    "y": 60,
    "width": 180
  }
}
</post-data>

### Regras dos textStyles:
- Incluir sempre que tiver contexto de identidade visual (brand_kit ou referencias)
- fontFamily DEVE ser uma das fontes disponíveis: Inter, Roboto, Open Sans, Poppins, Montserrat, DM Sans, Space Grotesk, Nunito, Raleway, Rubik, Barlow, Outfit, Plus Jakarta Sans, Playfair Display, Lora, Merriweather, Cormorant Garamond, EB Garamond, DM Serif Display, Bebas Neue, Anton, Oswald, Archivo Black, Black Ops One, Dela Gothic One, Boogaloo, Righteous, Baloo 2, Fredoka, Alfa Slab One, Permanent Marker, Pacifico, Lobster, Dancing Script, Satisfy, Caveat, Great Vibes, JetBrains Mono, Fira Code, Source Code Pro
- strokeWidth: 0 = sem contorno, 1-5 = contorno sutil, 6-15 = contorno forte
- shadowBlur: 0 = sombra dura (vintage/impacto), 8-15 = sombra suave (moderno/elegante)
- charSpacing: negativo = comprimido (display pesado), positivo = espaçado (minimalista/elegante)
- Se nao souber o estilo da marca, omitir textStyles (o usuario vai ajustar no editor)

### Regras do logo:
- Incluir campo "logo" APENAS se o brand_kit contiver logo
- Canvas e 1080x1080px
- Posicoes de texto: headline y≈180, subtitle y≈680, cta y≈880
- Logo NAO deve sobrepor texto
- Posicoes comuns: topo-esquerda {x:60,y:60}, topo-direita {x:820,y:60}, base-esquerda {x:60,y:900}
- width: 120 (discreta) a 280 (protagonista)
```

**Step 2: Atualizar `GeneratedImage` em `chat-panel.tsx`**

```ts
interface GeneratedImage {
  url: string;
  description?: string;
  platform?: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
  // novos
  logo?: { x: number; y: number; width: number };
  textStyles?: {
    headline?: Partial<import("./post-editor").ActiveTextProps>;
    subtitle?: Partial<import("./post-editor").ActiveTextProps>;
    cta?: Partial<import("./post-editor").ActiveTextProps>;
  };
}
```

**Step 3: Atualizar `editorImage` state em `chat-panel.tsx`**

```ts
const [editorImage, setEditorImage] = useState<{
  msgId: string;
  idx: number;
  url: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
  logo?: { x: number; y: number; width: number };
  textStyles?: GeneratedImage["textStyles"];
} | null>(null);
```

**Step 4: Atualizar `addChatImage` para incluir novos campos**

```ts
const addChatImage = useCallback((img: GeneratedImage) => {
  // ... logica existente igual, so garantir que os novos campos passam
  setEditorImage({ ..., logo: img.logo, textStyles: img.textStyles });
}, [...]);
```

Nas chamadas de `addChatImage` (linhas ~310, ~453, ~479), passar:
```ts
addChatImage({
  url: result.url,
  description: result.description,
  headline: data.headline,
  subtitle: data.subtitle,
  cta: data.cta,
  logo: data.logo,          // novo
  textStyles: data.textStyles, // novo
});
```

**Step 5: Atualizar `PostEditorModal` para receber e passar novos props**

```tsx
// Interface props:
interface PostEditorModalProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  headline?: string;
  subtitle?: string;
  cta?: string;
  agentId?: string;
  logoUrl?: string;
  logoPosition?: { x: number; y: number; width: number };
  textStyles?: {
    headline?: Partial<ActiveTextProps>;
    subtitle?: Partial<ActiveTextProps>;
    cta?: Partial<ActiveTextProps>;
  };
}

// handleReady:
const handleReady = useCallback(() => {
  editorRef.current?.initWithTextLayers({
    headline, subtitle, cta,
    logoUrl, logoPosition,
    textStyles,
  });
}, [headline, subtitle, cta, logoUrl, logoPosition, textStyles]);
```

**Step 6: Atualizar `PostEditorHandle.initWithTextLayers` em `post-editor.tsx`**

```ts
export interface PostEditorHandle {
  // ...
  initWithTextLayers: (layers: {
    headline?: string;
    subtitle?: string;
    cta?: string;
    logoUrl?: string;
    logoPosition?: { x: number; y: number; width: number };
    textStyles?: {
      headline?: Partial<ActiveTextProps>;
      subtitle?: Partial<ActiveTextProps>;
      cta?: Partial<ActiveTextProps>;
    };
  }) => void;
}
```

Dentro de `initWithTextLayers`:

```ts
initWithTextLayers: async ({ headline, subtitle, cta, logoUrl, logoPosition, textStyles }) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const fabric = await import("fabric");

  // Remove existing textboxes
  const existingTexts = canvas.getObjects("textbox");
  for (const obj of existingTexts) canvas.remove(obj);

  // Remove existing logo if any (custom type marker)
  const existingLogos = canvas.getObjects().filter((o: any) => o._isLogo);
  for (const obj of existingLogos) canvas.remove(obj);

  const layerDefs = [
    { key: "headline" as const, text: headline, y: 180, fontSize: 72, bold: true },
    { key: "subtitle" as const, text: subtitle, y: 680, fontSize: 42, bold: false },
    { key: "cta" as const,      text: cta,      y: 880, fontSize: 32, bold: false },
  ].filter((l): l is typeof l & { text: string } =>
    typeof l.text === "string" && l.text.trim().length > 0
  );

  for (const layer of layerDefs) {
    const styleOverride = textStyles?.[layer.key] ?? {};
    const fontFamily = styleOverride.fontFamily ?? "Inter";
    await loadGoogleFont(fontFamily);

    const textbox = new fabric.Textbox(layer.text, {
      left: CANVAS_SIZE / 2,
      top: layer.y,
      originX: "center",
      originY: "center",
      width: 900,
      fontSize: styleOverride.fontSize ?? layer.fontSize,
      fontFamily,
      fill: styleOverride.fill ?? "#ffffff",
      textAlign: styleOverride.textAlign ?? "center",
      fontWeight: styleOverride.fontWeight ?? (layer.bold ? "bold" : "normal"),
      fontStyle: styleOverride.fontStyle ?? "normal",
      strokeWidth: styleOverride.strokeWidth ?? 0,
      stroke: styleOverride.stroke ?? "",
      charSpacing: styleOverride.charSpacing ?? 0,
      lineHeight: styleOverride.lineHeight ?? 1.16,
      opacity: styleOverride.opacity ?? 1,
      editable: true,
      shadow: new fabric.Shadow({
        color: styleOverride.shadowColor ?? "rgba(0,0,0,0.7)",
        blur: styleOverride.shadowBlur ?? 10,
        offsetX: styleOverride.shadowOffsetX ?? 2,
        offsetY: styleOverride.shadowOffsetY ?? 2,
      }),
    });
    canvas.add(textbox);
  }

  // Insert logo
  if (logoUrl && logoPosition) {
    const logoImg = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
    const scaleX = logoPosition.width / (logoImg.width || 1);
    logoImg.set({
      left: logoPosition.x,
      top: logoPosition.y,
      scaleX,
      scaleY: scaleX,
      selectable: true,
      hasControls: true,
      lockRotation: true,
    });
    (logoImg as any)._isLogo = true;
    canvas.add(logoImg);
  }

  canvas.renderAll();
},
```

**Step 7: Testar end-to-end**
1. Criar um post com o agente, forcar o agente a incluir `textStyles` e `logo` no post-data
2. Abrir o editor — headline deve ter a fonte e efeitos do agente
3. Logo deve aparecer no canto correto
4. Ajustar posicao da logo arrastando

**Step 8: Commit**
```bash
git add app/api/chat/route.ts components/chat-panel.tsx components/post-editor-modal.tsx components/post-editor.tsx
git commit -m "feat: agent textStyles + logo auto-insertion — designer AI pipeline complete"
```

---

## Task 7: DNA visual profundo nas referencias

**Files:**
- Modify: `app/api/analyze-reference/route.ts` (expandir analise tipografica)
- Modify: `app/api/chat/route.ts` (buildSystemPrompt usa DNA tipografico)

**Step 1: Verificar estrutura atual do analyze-reference**

Ler `app/api/analyze-reference/route.ts`. O retorno atual deve incluir `overallAnalysis`, `dominantColors`, `layoutStructure`.

**Step 2: Expandir o prompt de analise para incluir tipografia**

No prompt enviado ao Groq Vision, adicionar:

```
Analyze this brand reference image and return JSON with:
{
  "overallAnalysis": "2-3 sentences describing the visual style and mood",
  "dominantColors": ["#hex1", "#hex2", "#hex3"],
  "layoutStructure": "description of composition and layout",
  "typographyStyle": "one of: sans-display-heavy | sans-minimal | serif-elegant | script-fluid | mixed-hierarchy | no-text",
  "textEffects": ["outline", "hard-shadow", "soft-shadow", "gradient", "none"],
  "fontWeight": "one of: ultralight | light | regular | bold | extrabold | black",
  "charSpacingFeel": "one of: very-tight | tight | normal | wide | very-wide",
  "compositionType": "one of: text-dominant | image-dominant | balanced | text-overlay | text-integrated",
  "commercialStyle": "one of: luxury | lifestyle | bold-street | minimal-tech | playful | traditional"
}
```

**Step 3: Salvar campos novos em `brand_references`**

A tabela `brand_references` tem coluna `analysis` (text) e `extracted_colors`, `extracted_layout`. Adicionar uma migration para o campo `typography_dna` (jsonb):

```sql
-- supabase/migrations/004_typography_dna.sql
alter table brand_references
  add column if not exists typography_dna jsonb;
```

Rodar: `node scripts/run-migration.mjs supabase/migrations/004_typography_dna.sql`

**Step 4: Salvar `typography_dna` na analise**

Em `app/api/analyze-reference/route.ts`, incluir no retorno:
```ts
return NextResponse.json({
  overallAnalysis: parsed.overallAnalysis,
  dominantColors: parsed.dominantColors,
  layoutStructure: parsed.layoutStructure,
  typographyDna: {
    style: parsed.typographyStyle,
    effects: parsed.textEffects,
    weight: parsed.fontWeight,
    charSpacing: parsed.charSpacingFeel,
    composition: parsed.compositionType,
    commercial: parsed.commercialStyle,
  },
});
```

Em `app/api/brand-agents/route.ts` (POST), ao salvar referencias:
```ts
typography_dna: ref.typographyDna || null,
```

Em `app/onboarding/page.tsx`, ao chamar `/api/analyze-reference`:
```ts
analysisData = await analyzeRes.json();
// e salvar:
uploadedRefs.push({
  ...,
  typographyDna: analysisData.typographyDna,
});
```

**Step 5: Usar DNA tipografico em `buildSystemPrompt`**

```ts
// Na query do buildSystemPrompt:
db.from("brand_references")
  .select("image_url, analysis, extracted_colors, extracted_layout, typography_dna")
  .eq("agent_id", agentId)
  .order("created_at")

// Ao montar brandContext:
const refs = refsData.filter(r => !r.is_anti_reference);
const typoDna = refs
  .filter(r => r.typography_dna)
  .map(r => r.typography_dna)
  .slice(0, 3);

if (typoDna.length > 0) {
  brandContext += `\n### DNA Tipografico (extraido das referencias)\n`;
  typoDna.forEach((dna: any, i) => {
    brandContext += `- Referencia ${i+1}: estilo=${dna.style}, efeitos=${(dna.effects||[]).join(',')}, peso=${dna.weight}, charSpacing=${dna.charSpacing}, estilo-comercial=${dna.commercial}\n`;
  });
  brandContext += `\nUse este DNA para escolher fontFamily e textStyles condizentes com a identidade visual real da marca.\n`;
}
```

**Step 6: Commit**
```bash
git add app/api/analyze-reference/route.ts app/api/brand-agents/route.ts app/api/chat/route.ts app/onboarding/page.tsx supabase/migrations/004_typography_dna.sql
git commit -m "feat: typography DNA extraction from references — agent uses visual identity in textStyles"
```

---

## Task 8: Feedback loop — brand memory de estilos aprovados

**Files:**
- Modify: `components/chat-panel.tsx` (onSave grava estilo aprovado)
- Modify: `app/api/chat/route.ts` (buildSystemPrompt le estilos aprovados)

**Step 1: Ao salvar um post, gravar o estilo usado em `brand_memory`**

Em `chat-panel.tsx`, no `PostEditorModal`:
```tsx
onSave={async (dataUrl) => {
  // logica existente de substituir a imagem no chat
  handleEditorSave(dataUrl);

  // Gravar estilo aprovado no brand_memory
  if (editorImage?.textStyles && agentId) {
    await fetch("/api/brand-memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        agentId,
        type: "approved_style",
        content: JSON.stringify({
          textStyles: editorImage.textStyles,
          approvedAt: new Date().toISOString(),
        }),
      }),
    });
  }
}}
```

**Step 2: `buildSystemPrompt` le os 3 ultimos estilos aprovados**

```ts
const { data: memories } = await db
  .from("brand_memory")
  .select("content")
  .eq("agent_id", agentId)
  .eq("type", "approved_style")
  .order("created_at", { ascending: false })
  .limit(3);

if (memories?.length) {
  brandContext += `\n### Estilos Aprovados Recentemente\n`;
  brandContext += `O usuario aprovou estes estilos nos ultimos posts. Priorize a continuidade:\n`;
  memories.forEach((m, i) => {
    try {
      const style = JSON.parse(m.content);
      brandContext += `- Post ${i+1}: ${JSON.stringify(style.textStyles)}\n`;
    } catch { /* ignore malformed */ }
  });
}
```

**Step 3: Criar `POST /api/brand-memory` se nao existir**

```ts
// app/api/brand-memory/route.ts
import { createServerClient } from "@/lib/supabase-server";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const body = await req.json();
  const db = await createServerClient();

  const { error } = await db.from("brand_memory").insert({
    agent_id: body.agentId,
    type: body.type,
    content: body.content,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
```

**Step 4: Testar**
- Criar um post, abrir editor, aplicar preset "Impact", salvar
- Criar outro post com o mesmo agente
- Verificar que o agente sugere estilos parecidos com o aprovado

**Step 5: Commit**
```bash
git add components/chat-panel.tsx app/api/brand-memory/route.ts app/api/chat/route.ts
git commit -m "feat: brand memory feedback loop — approved styles influence future suggestions"
```

---

## Deploy Final

```bash
git push origin main
```

Verificar no Vercel que o build passou. Testar o fluxo completo:
1. Login → selecionar Brand Agent com referencias
2. Pedir um post → agente faz briefing com sugestao tipografica
3. Aprovar → editor abre com fontes/efeitos/logo do agente
4. Ajustar e salvar → proximo post ja lembra o estilo aprovado
