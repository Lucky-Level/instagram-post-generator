# Multi-Platform + Edição por IA — Plano de Implementação

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Adicionar suporte a múltiplas plataformas (dimensões dinâmicas no pipeline completo) e edição de imagem via FLUX Kontext image-to-image sem refazer o pipeline.

**Architecture:**
- Feature 1: `render-typography` e `compose-post` aceitam `width`/`height` opcionais (default 1080). `composeCreative` repassa as dimensões. O pipeline primário usa as dimensões do primeiro formato selecionado. Variantes usam as dimensões de cada formato individual.
- Feature 2: Nova server action `edit-with-flux.ts` chama FLUX Kontext Pro com `input_image` + `prompt`. Chat-panel adiciona botão "Editar com IA" que mostra input inline e substitui a imagem sem refazer o pipeline.

**Tech Stack:** Next.js 15 App Router, Sharp, Satori + Resvg, Replicate (FLUX Kontext Pro), React, pnpm

---

## Contexto crítico para implementação

### Arquivos chave e seus papéis

| Arquivo | Papel |
|---------|-------|
| `app/api/render-typography/route.ts` | Satori → SVG → PNG com texto; `CANVAS_SIZE=1080` hardcoded |
| `app/api/compose-post/route.ts` | Sharp compositor; `CANVAS=1080` hardcoded |
| `components/chat-panel.tsx` | `composeCreative()` helper (ln 177-227); pipeline `createPipeline()` (ln 304); variant loop (ln 616-662); image display com hover overlay (ln 968-1048) |
| `app/actions/image/create.ts` | `generateImageAction` — routing por provider |
| `app/actions/image/flux-kontext.ts` | `generateWithFacePreservation` — Replicate, já aceita `aspectRatio` |
| `app/api/chat/route.ts` | `BASE_SYSTEM_PROMPT` — contém "Instagram" explícito |
| `lib/platform-formats.ts` | `getPlatformFormats()` — 26 formatos, `PlatformFormat.{ id, width, height, aspect_ratio }` |

### Estado atual do pipeline

```
selectedFormats[0] = "ig-feed-sq" (default)
createPipeline(postData):
  1. generateImageAction({ prompt }) → imageResult.url (1024×1024 aprox)
  2. composeCreative({ backgroundUrl, ... }) 
     → POST /api/render-typography (1080×1080 hardcoded)
     → POST /api/compose-post (1080×1080 hardcoded)
  3. addChatImage(composedUrl)
  4. for extraFormats:
     → POST /api/compose (resize bg para fmt.width×fmt.height)
     → composeCreative (AINDA 1080×1080 — BUG)
```

### Formato de aspect_ratio esperado pelo FLUX Kontext

O Replicate `flux-kontext-pro` aceita `aspect_ratio` como string: `"1:1"`, `"16:9"`, `"9:16"`, `"4:5"`, etc.  
`lib/platform-formats.ts` já tem `aspect_ratio` em cada formato (ex: `"1:1"`, `"9:16"`, `"16:9"`, `"4:5"`, `"1.91:1"`).  
Porém `"1.91:1"` não é aceito pelo FLUX — mapear para `"16:9"` ou `"9:16"`.

---

## Task 1: render-typography aceita width/height dinâmicos

**Arquivo:** `app/api/render-typography/route.ts`

**O que muda:**
- Adicionar `width?: number; height?: number` na interface `RenderTypographyRequest`
- Computar `W = width ?? 1080; H = height ?? 1080`
- Escalar y-positions proporcionalmente a H: `yScaled = Math.round(y / 1080 * H)`
- Escalar defaultSize proporcionalmente a H: `defaultSize * H / 1080`
- Escalar horizontal padding: `Math.round(90 / 1080 * W)`
- Passar `width: W, height: H` ao satori e resvg

**Step 1: Editar a interface e as constantes**

Localizar (ln 8): `const CANVAS_SIZE = 1080;`

Substituir por:
```typescript
// (removido — calculado por request)
```

Localizar (ln 8): `interface RenderTypographyRequest {`

Adicionar `width?: number; height?: number;` aos campos.

**Step 2: Usar W e H no corpo da função POST**

Após `const { headline, subtitle, cta, textStyles } = body;` adicionar:
```typescript
const W = body.width ?? 1080;
const H = body.height ?? 1080;
```

**Step 3: Escalar layers**

```typescript
const layers = [
  { key: "headline" as const, text: headline, yFrac: 180/1080, defaultSizeFrac: 72/1080, bold: true },
  { key: "subtitle" as const, text: subtitle, yFrac: 680/1080, defaultSizeFrac: 42/1080, bold: false },
  { key: "cta"      as const, text: cta,      yFrac: 880/1080, defaultSizeFrac: 32/1080, bold: false },
].filter((l): l is typeof l & { text: string } => typeof l.text === "string" && l.text.trim().length > 0)
 .map(l => ({ ...l, y: Math.round(l.yFrac * H), defaultSize: Math.round(l.defaultSizeFrac * H) }));
```

**Step 4: Atualizar a chamada ao satori**

```typescript
// Trocar CANVAS_SIZE por W e H:
style: {
  width: W,
  height: H,
  ...
}
// E:
{
  width: W,
  height: H,
  fonts,
}
```

**Step 5: Atualizar o Resvg**

```typescript
const resvg = new Resvg(svgWithFilters, {
  fitTo: { mode: "width", value: W },
});
```

**Step 6: Atualizar padding**

```typescript
const hPad = Math.round(90 / 1080 * W);
// No JSX de cada layer:
padding: `0 ${hPad}px`,
```

**Step 7: Verificar build local**
```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator\.claude\worktrees\wonderful-varahamihira"
pnpm build 2>&1 | tail -30
```
Esperado: sem erros TypeScript

**Step 8: Commit**
```bash
git add app/api/render-typography/route.ts
git commit -m "feat: render-typography accepts dynamic width/height"
```

---

## Task 2: compose-post aceita width/height dinâmicos

**Arquivo:** `app/api/compose-post/route.ts`

**O que muda:**
- Adicionar `width?: number; height?: number` em `ComposePostRequest`
- Substituir `const CANVAS = 1080` por `const W = body.width ?? 1080; const H = body.height ?? 1080`
- Usar W e H em todos os lugares onde 1080 aparece

**Step 1: Editar interface**

```typescript
interface ComposePostRequest {
  backgroundUrl: string;
  typographyPng?: string;
  logoUrl?: string;
  logoPosition?: { x: number; y: number; width: number };
  productLayerUrl?: string;
  width?: number;   // ← novo
  height?: number;  // ← novo
}
```

**Step 2: Substituir CANVAS**

Remover `const CANVAS = 1080;`  
Adicionar após destructuring:
```typescript
const W = body.width ?? 1080;
const H = body.height ?? 1080;
```

**Step 3: Atualizar uso de CANVAS**

- Product layer: `PRODUCT_W = Math.round(W * 0.65)`, `Math.round(H * 0.75)`, `(W - pw) / 2`, `(H - ph) / 2`
- Typography: `.resize(W, H, { fit: "fill" })`
- Logo position: sem mudança (coordenadas absolutas do agent)
- Pipeline: `.resize(W, H, { fit: "cover", position: "center" })`
- Output JSON: `width: W, height: H`

**Step 4: Verificar build**
```bash
pnpm build 2>&1 | tail -20
```

**Step 5: Commit**
```bash
git add app/api/compose-post/route.ts
git commit -m "feat: compose-post accepts dynamic width/height"
```

---

## Task 3: composeCreative helper aceita width/height

**Arquivo:** `components/chat-panel.tsx`

**O que muda:**
- Adicionar `width?: number; height?: number` aos params de `composeCreative`
- Passar `width` e `height` nas chamadas a `/api/render-typography` e `/api/compose-post`

**Step 1: Atualizar a assinatura de composeCreative** (ln ~177)

```typescript
const composeCreative = useCallback(async (params: {
  backgroundUrl: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
  textStyles?: GeneratedImage["textStyles"];
  logo?: { x: number; y: number; width: number };
  logoUrl?: string;
  width?: number;   // ← novo
  height?: number;  // ← novo
}): Promise<string> => {
  const { backgroundUrl, headline, subtitle, cta, textStyles, logo, logoUrl, width, height } = params;
```

**Step 2: Passar width/height no body do render-typography** (ln ~195)

```typescript
body: JSON.stringify({ headline, subtitle, cta, textStyles, width, height }),
```

**Step 3: Passar width/height no body do compose-post** (ln ~208)

```typescript
body: JSON.stringify({
  backgroundUrl,
  typographyPng,
  logoUrl,
  logoPosition: logo,
  width,
  height,
}),
```

**Step 4: Verificar tipos**
```bash
pnpm build 2>&1 | grep -i "error" | head -20
```

**Step 5: Commit**
```bash
git add components/chat-panel.tsx
git commit -m "feat: composeCreative forwards width/height to typography and compositor"
```

---

## Task 4: Pipeline primário usa dimensões da plataforma; variantes também

**Arquivo:** `components/chat-panel.tsx`

**Contexto:**
- `selectedFormats` é um `string[]` de IDs (ex: `["ig-feed-sq", "li-feed"]`)
- `getPlatformFormats()` retorna todos os formatos com `{ id, width, height, aspect_ratio }`
- O pipeline principal está em `createPipeline()` (ln 304)
- O loop de variantes está ~ln 616

**Step 1: Computar formato primário no início de createPipeline**

Após `const currentRefs = referenceImagesRef.current;` (ln ~308), adicionar:

```typescript
const allFormats = getPlatformFormats();
const primaryFormat = allFormats.find((f) => f.id === selectedFormats[0])
  ?? allFormats.find((f) => f.id === "ig-feed-sq")!;
const primaryW = primaryFormat.width;
const primaryH = primaryFormat.height;
```

**Step 2: Passar width/height na chamada principal de composeCreative** (~ln 451 para carousel e ~ln 603 para single)

Para carousel (ln ~451):
```typescript
const composedSlideUrl = await composeCreative({
  backgroundUrl: result.url,
  headline: data.headline,
  subtitle: data.subtitle,
  cta: data.cta,
  textStyles: data.textStyles,
  logo: data.logo,
  logoUrl: undefined,
  width: primaryW,   // ← novo
  height: primaryH,  // ← novo
});
```

Para single image (ln ~603):
```typescript
const composedUrl = await composeCreative({
  backgroundUrl: imageResult.url,
  headline: data.headline,
  subtitle: data.subtitle,
  cta: data.cta,
  textStyles: data.textStyles,
  logo: data.logo,
  logoUrl: undefined,
  width: primaryW,   // ← novo
  height: primaryH,  // ← novo
});
```

**Step 3: Atualizar label da imagem primária** (~ln 612)

```typescript
addChatImage({
  url: composedUrl,
  description: imageResult.description,
  platform: `${primaryFormat.platform} — ${primaryFormat.format_name} (${primaryW}×${primaryH})`,
  ...
});
```

**Step 4: Corrigir loop de variantes** (~ln 616-662)

O bug atual: variantes resize o bg mas chamam `composeCreative` sem width/height.

**Refatorar o loop de variantes** para usar a dimensão de cada formato:

```typescript
// Generate variants for OTHER selected platform formats
const extraFormats = selectedFormats
  .filter((fid) => fid !== selectedFormats[0])  // exclui o primário
  .map((fid) => allFormats.find((f) => f.id === fid))
  .filter(Boolean) as PlatformFormat[];

if (extraFormats.length > 0) {
  toast.info(`Gerando ${extraFormats.length} variante(s) de plataforma...`);
  for (const fmt of extraFormats) {
    try {
      // 1. Redimensionar bg para as dimensões do formato
      const composeRes = await fetch("/api/compose", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          imageUrl: imageResult.url,
          width: fmt.width,
          height: fmt.height,
          fit: "cover",
        }),
      });
      if (!composeRes.ok) continue;
      const composed = await composeRes.json();

      // 2. Compor com tipografia nas dimensões corretas
      const composedVariantUrl = await composeCreative({
        backgroundUrl: composed.url,
        headline: data.headline,
        subtitle: data.subtitle,
        cta: data.cta,
        textStyles: data.textStyles,
        logo: data.logo,
        logoUrl: undefined,
        width: fmt.width,   // ← correto agora
        height: fmt.height, // ← correto agora
      });
      addChatImage({
        url: composedVariantUrl,
        description: `${fmt.platform} — ${fmt.format_name} (${fmt.width}×${fmt.height})`,
        platform: `${fmt.platform} — ${fmt.format_name}`,
        headline: data.headline,
        subtitle: data.subtitle,
        cta: data.cta,
        logo: data.logo,
        textStyles: data.textStyles,
      });
    } catch {
      // Variante falhou silenciosamente
    }
  }
}
```

**Step 5: Verificar build**
```bash
pnpm build 2>&1 | tail -30
```

**Step 6: Commit**
```bash
git add components/chat-panel.tsx
git commit -m "feat: multi-platform pipeline — primary and variant formats use correct dimensions"
```

---

## Task 5: Geração de imagem com aspect_ratio da plataforma

**Arquivos:** `app/actions/image/create.ts`, `app/actions/image/generate-ad-scene.ts`

**Contexto:**
- `generateImageAction` atualmente não passa aspect_ratio para nenhum provider
- `flux-kontext.ts` já aceita `aspectRatio?: string` (ln 13)
- Precisamos mapear `PlatformFormat.aspect_ratio` (ex: `"1.91:1"`) para valores aceitos pelo FLUX

**Step 1: Criar helper de mapeamento de aspect_ratio**

Em `lib/platform-formats.ts`, adicionar ao final:

```typescript
// Mapeia o aspect_ratio do formato para string aceita pelo FLUX Kontext Pro
export function toFluxAspectRatio(aspectRatio: string): string {
  const map: Record<string, string> = {
    "1:1":    "1:1",
    "4:5":    "4:5",
    "9:16":   "9:16",
    "16:9":   "16:9",
    "1.91:1": "16:9",  // LinkedIn feed, Facebook feed (closest)
    "3:1":    "16:9",  // Twitter header (sem suporte nativo → 16:9)
    "2:3":    "2:3",
    "1:2.1":  "9:16",  // Pinterest long pin (aproximação)
  };
  return map[aspectRatio] ?? "1:1";
}
```

**Step 2: Atualizar generateImageAction para aceitar aspectRatio**

Em `app/actions/image/create.ts`, linha ~11:

```typescript
interface GenerateImageActionProps {
  prompt: string;
  modelId: string;
  instructions?: string;
  referenceImages?: string[];
  aspectRatio?: string;  // ← novo: ex: "1:1", "9:16", "16:9"
  targetWidth?: number;  // ← novo: para Pollinations
  targetHeight?: number; // ← novo: para Pollinations
}
```

**Step 3: Passar aspectRatio para FLUX Kontext** (~ln 178)

```typescript
if (referenceImages?.length && process.env.REPLICATE_API_TOKEN) {
  const refImage = referenceImages[0];
  const result = await generateWithFacePreservation({
    prompt: fullPrompt,
    referenceImageUrl: refImage,
    aspectRatio: aspectRatio ?? "1:1",  // ← novo
  });
  ...
}
```

**Step 4: Atualizar Pollinations com dimensões** (~ln 150)

```typescript
const w = targetWidth ?? 1024;
const h = targetHeight ?? 1024;
const url = `https://image.pollinations.ai/prompt/${encoded}?width=${w}&height=${h}&nologo=true&seed=${seed}`;
```

**Step 5: Atualizar Cloudflare com dimensões** (~ln 113)

```typescript
body: JSON.stringify({
  prompt: prompt + NO_TEXT_SUFFIX,
  ...(targetWidth ? { width: targetWidth, height: targetHeight } : {}),
}),
```

**Step 6: Chamar generateImageAction com aspectRatio no createPipeline**

Em `chat-panel.tsx`, nas chamadas a `generateImageAction` dentro de `createPipeline`:

```typescript
const result = await generateImageAction({
  prompt: ...,
  modelId: "gemini",
  referenceImages: ...,
  aspectRatio: toFluxAspectRatio(primaryFormat.aspect_ratio),  // ← novo
  targetWidth: primaryW,
  targetHeight: primaryH,
});
```

Importar `toFluxAspectRatio` no topo do chat-panel.tsx:
```typescript
import { ..., toFluxAspectRatio } from "@/lib/platform-formats";
```

**Step 7: Verificar build**
```bash
pnpm build 2>&1 | tail -30
```

**Step 8: Commit**
```bash
git add app/actions/image/create.ts lib/platform-formats.ts components/chat-panel.tsx
git commit -m "feat: image generation uses platform aspect_ratio and dimensions"
```

---

## Task 6: Labels agnósticas de plataforma + system prompt

**Arquivos:** `app/api/chat/route.ts`, `components/chat-panel.tsx`

**Step 1: Atualizar BASE_SYSTEM_PROMPT no chat/route.ts**

Localizar linha 8: `Você é o Post Agent — um diretor criativo de agência premium.`
Substituir por: `Você é o Agente Criativo — um diretor criativo de agência premium.`

Localizar: `"legenda": "hook forte + corpo + fechamento (2-4 linhas para o caption do Instagram)"`
Substituir: `"legenda": "hook forte + corpo + fechamento (2-4 linhas para o caption)"`

Localizar: `Posso criar?`
Manter igual (já é agnóstico).

Verificar: remover qualquer referência a "Instagram" que implique dimensão ou plataforma específica no restante do prompt.

**Step 2: Atualizar labels no chat-panel.tsx**

Localizar (ln ~879): `<h2 className="font-medium text-sm">Post Agent</h2>`
Substituir: `<h2 className="font-medium text-sm">Agente Criativo</h2>`

Localizar (ln ~899): `O que quer criar?`
Manter igual (já agnóstico).

Localizar (ln ~903): `Descreva sua ideia ou escolha um template para comecar`
Manter igual.

Localizar (ln ~1145): `{generating ? "Building workflow..." : "Workflow complete"}`
Substituir: `{generating ? "Criando criativo..." : "Criativo criado"}`

Localizar (ln ~1103): `Let's go!`
Substituir: `Criar!`

**Step 3: Verificar build**
```bash
pnpm build 2>&1 | tail -20
```

**Step 4: Commit**
```bash
git add app/api/chat/route.ts components/chat-panel.tsx
git commit -m "feat: platform-agnostic labels and system prompt"
```

---

## Task 7: Server action para edição via FLUX Kontext

**Arquivo:** `app/actions/image/edit-with-flux.ts` (CRIAR)

**Contexto:**
- `flux-kontext.ts` exporta `generateWithFacePreservation({ prompt, referenceImageUrl, aspectRatio })`
- Esse mesmo modelo funciona para image-to-image editing (FLUX Kontext Pro)
- A imagem de entrada é a imagem já gerada no chat (data URL ou URL pública)
- O resultado substitui a imagem original no estado `chatImages`

**Step 1: Criar o arquivo**

```typescript
"use server";

import Replicate from "replicate";

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

export async function editWithFlux(params: {
  imageUrl: string;   // data URL ou URL pública da imagem atual
  prompt: string;     // instrução de edição em linguagem natural
  aspectRatio?: string;
}): Promise<{ url: string } | { error: string }> {
  if (!process.env.REPLICATE_API_TOKEN) {
    return { error: "REPLICATE_API_TOKEN não configurado" };
  }

  const { imageUrl, prompt, aspectRatio = "1:1" } = params;

  try {
    const output = await replicate.run(
      "black-forest-labs/flux-kontext-pro",
      {
        input: {
          prompt,
          input_image: imageUrl,
          aspect_ratio: aspectRatio,
          output_format: "png",
          safety_tolerance: 2,
        },
      },
    );

    let url: string;
    if (typeof output === "string") {
      url = output;
    } else if (Array.isArray(output) && output.length > 0) {
      url = String(output[0]);
    } else {
      url = String(output);
    }

    return { url };
  } catch (err) {
    return { error: (err as Error).message };
  }
}
```

**Step 2: Verificar que Replicate está no package.json**

```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator\.claude\worktrees\wonderful-varahamihira"
grep "replicate" package.json
```

Se não aparecer: `pnpm add replicate`

**Step 3: Verificar build**
```bash
pnpm build 2>&1 | grep -i error | head -10
```

**Step 4: Commit**
```bash
git add app/actions/image/edit-with-flux.ts
git commit -m "feat: editWithFlux server action — FLUX Kontext image-to-image editing"
```

---

## Task 8: UI de edição por IA no chat-panel

**Arquivo:** `components/chat-panel.tsx`

**UX Flow:**
1. Imagem no chat tem hover overlay com 3 botões: ✏️ (editor canvas), 🤖 (editar com IA), ⬇️ (download)
2. Clicar em 🤖 toggle um input inline abaixo da imagem específica
3. Usuário escreve instrução e pressiona Enter ou clica "Aplicar"
4. Loading indicator substitui os botões
5. Resultado: URL da imagem atualizada no `chatImages[msgId][idx]`
6. Se falhar (sem REPLICATE_API_TOKEN ou erro): toast.error + fallback para Gemini via `/api/edit-image`

**Step 1: Importar editWithFlux e SparklesIcon**

No topo do arquivo:
```typescript
import { editWithFlux } from "@/app/actions/image/edit-with-flux";
import { SparklesIcon } from "lucide-react";
```

**Step 2: Adicionar estado de edição por IA**

Junto dos outros states (~ln 122):
```typescript
const [aiEditState, setAiEditState] = useState<{
  msgId: string;
  idx: number;
  prompt: string;
  loading: boolean;
} | null>(null);
```

**Step 3: Função handleAiEdit**

Adicionar após `composeCreative` (~ln 228):
```typescript
const handleAiEdit = useCallback(async (msgId: string, idx: number, currentUrl: string) => {
  if (!aiEditState || aiEditState.loading) return;
  const prompt = aiEditState.prompt.trim();
  if (!prompt) return;

  setAiEditState((prev) => prev ? { ...prev, loading: true } : null);
  toast.info("Editando com IA...");

  try {
    const result = await editWithFlux({ imageUrl: currentUrl, prompt });

    if ("error" in result) {
      // Fallback: Gemini via /api/edit-image
      toast.info("FLUX indisponível, tentando com Gemini...");
      const fallbackRes = await fetch("/api/edit-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: currentUrl, action: "edit", prompt }),
      });
      const fallbackData = await fallbackRes.json();
      if (fallbackRes.ok && fallbackData.url) {
        setChatImages((prev) => {
          const imgs = [...(prev[msgId] ?? [])];
          imgs[idx] = { ...imgs[idx], url: fallbackData.url };
          return { ...prev, [msgId]: imgs };
        });
        toast.success("Imagem editada!");
      } else {
        toast.error(`Erro ao editar: ${result.error}`);
      }
    } else {
      setChatImages((prev) => {
        const imgs = [...(prev[msgId] ?? [])];
        imgs[idx] = { ...imgs[idx], url: result.url };
        return { ...prev, [msgId]: imgs };
      });
      toast.success("Imagem editada!");
    }
  } catch (err) {
    toast.error("Erro ao editar imagem");
    console.error(err);
  } finally {
    setAiEditState(null);
  }
}, [aiEditState]);
```

**Step 4: Atualizar hover overlay das imagens** (~ln 988-1009)

Localizar o bloco:
```tsx
<div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
  <button onClick={() => setEditorImage(...)} ...>
    <PencilIcon className="size-4" />
  </button>
  <button onClick={download} ...>
    <DownloadIcon className="size-4" />
  </button>
</div>
```

Adicionar botão de edição por IA ENTRE o pencil e o download:
```tsx
<button
  onClick={() => setAiEditState({
    msgId: msg.id,
    idx,
    prompt: "",
    loading: false,
  })}
  className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:bg-white transition-colors"
  title="Editar com IA"
>
  <SparklesIcon className="size-4" />
</button>
```

**Step 5: Adicionar input inline abaixo da imagem**

Dentro do loop de imagens, após o bloco da imagem (após o bloco de feedback ~ln 1011-1044), adicionar:

```tsx
{/* Input de edição por IA */}
{aiEditState?.msgId === msg.id && aiEditState.idx === idx && (
  <div className="px-2 pb-2 pt-1 border-t border-border bg-secondary/20 rounded-b-xl -mt-1">
    <form
      onSubmit={(e) => {
        e.preventDefault();
        handleAiEdit(msg.id, idx, img.url);
      }}
      className="flex gap-2 items-center"
    >
      <input
        autoFocus
        type="text"
        placeholder="Descreva a edição... (ex: mude o fundo para azul)"
        value={aiEditState.prompt}
        onChange={(e) => setAiEditState((prev) => prev ? { ...prev, prompt: e.target.value } : null)}
        disabled={aiEditState.loading}
        className="flex-1 text-xs bg-transparent border border-border rounded-md px-2 py-1.5 outline-none focus:border-primary placeholder:text-muted-foreground/60 disabled:opacity-50"
      />
      {aiEditState.loading ? (
        <Loader2Icon className="size-4 animate-spin text-muted-foreground shrink-0" />
      ) : (
        <div className="flex gap-1 shrink-0">
          <button
            type="submit"
            disabled={!aiEditState.prompt.trim()}
            className="text-xs px-2.5 py-1.5 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-40 transition-colors"
          >
            Aplicar
          </button>
          <button
            type="button"
            onClick={() => setAiEditState(null)}
            className="text-xs px-2 py-1.5 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
          >
            <XIcon className="size-3" />
          </button>
        </div>
      )}
    </form>
  </div>
)}
```

**Step 6: Fechar o aiEditState quando outra imagem é clicada**

O estado `aiEditState` já guarda `msgId` e `idx`, então renderizar o input apenas quando corresponde à imagem correta é suficiente (ver Step 5 com a condição `aiEditState?.msgId === msg.id && aiEditState.idx === idx`).

**Step 7: Verificar build**
```bash
pnpm build 2>&1 | tail -40
```
Corrigir quaisquer erros TypeScript.

**Step 8: Commit**
```bash
git add components/chat-panel.tsx app/actions/image/edit-with-flux.ts
git commit -m "feat: edit image with AI — FLUX Kontext inline editor in chat"
```

---

## Task 9: Build final e verificação

```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator\.claude\worktrees\wonderful-varahamihira"
pnpm build
```

Esperado: `✓ Compiled successfully` com 0 erros TypeScript.

Se houver erros:
- Ler a mensagem completa
- Localizar o arquivo e linha
- Corrigir o tipo ou importação
- Rodar build novamente

---

## Task 10: Merge no main

```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator\.claude\worktrees\wonderful-varahamihira"
git log --oneline -10
git checkout main
git merge claude/wonderful-varahamihira --no-ff -m "feat: multi-platform support + AI image editing"
git push origin main
```

---

## Checklist de validação pós-implementação

- [ ] `render-typography` aceita `width=1200&height=627` e gera PNG de 1200×627
- [ ] `compose-post` aceita `width=1200&height=627` e compõe em 1200×627
- [ ] `composeCreative` repassa dimensões corretamente
- [ ] Selecionar "LinkedIn Feed Post" gera imagem primária 1200×627
- [ ] Selecionar múltiplos formatos gera variantes cada uma com dimensões corretas
- [ ] Botão ✨ aparece no hover overlay das imagens geradas
- [ ] Clicar ✨ mostra input inline
- [ ] Digitar instrução e clicar "Aplicar" chama FLUX Kontext e substitui a imagem
- [ ] Fallback para Gemini quando REPLICATE_API_TOKEN ausente
- [ ] Build sem erros
- [ ] Labels "Post Agent" substituídas por "Agente Criativo"
- [ ] System prompt sem referência explícita ao Instagram
