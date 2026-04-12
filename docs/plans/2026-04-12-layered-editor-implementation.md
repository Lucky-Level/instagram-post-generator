# Layered Editor Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** AI gera apenas o fundo visual (sem texto baked in), texto e pre-populado como camadas editaveis no Fabric.js canvas.

**Architecture:** System prompt proibe texto no imagePrompt + sufixo "no text" nos providers. `<post-data>` ganha campos `headline/subtitle/cta`. Editor recebe esses campos e cria Textboxes editaveis pre-posicionados automaticamente.

**Tech Stack:** Next.js 16, Fabric.js 7, TypeScript, Gemini/Cloudflare/Pollinations (providers de imagem)

---

## Task 1: Adicionar `headline/subtitle/cta` ao PostData e ao estado do editor

**Files:**
- Modify: `components/chat-panel.tsx` (interface PostData + editorImage state + PostEditorModal props)

**Step 1: Atualizar a interface PostData**

Localizar (linha ~46):
```typescript
interface PostData {
  type?: "video";
  action?: "edit";
  legenda: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
  slides?: { text: string; imagePrompt: string }[];
}
```

Substituir por:
```typescript
interface PostData {
  type?: "video";
  action?: "edit";
  legenda: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
  headline?: string;
  subtitle?: string;
  slides?: { text: string; imagePrompt: string }[];
}
```

**Step 2: Atualizar o estado editorImage**

Localizar (linha ~112):
```typescript
const [editorImage, setEditorImage] = useState<{ msgId: string; idx: number; url: string } | null>(null);
```

Substituir por:
```typescript
const [editorImage, setEditorImage] = useState<{
  msgId: string;
  idx: number;
  url: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
} | null>(null);
```

**Step 3: Passar os campos de texto ao abrir o editor**

Localizar onde `setEditorImage` e chamado com o botao de editar (linha ~806):
```typescript
onClick={() => setEditorImage({ msgId: msg.id, idx, url: img.url })}
```

Para passar os campos, precisamos ter acesso ao `postData` da mensagem. Verificar se o `chatImages` armazena o postData ou apenas a URL. Se nao armazena, adicionar os campos na interface `GeneratedImage` ou buscar o postData do texto da mensagem.

**Abordagem mais simples:** Armazenar `headline/subtitle/cta` junto com a imagem gerada no `chatImages`.

Localizar a interface `GeneratedImage` (provavelmente no topo do arquivo):
```typescript
interface GeneratedImage {
  url: string;
  // adicionar:
  headline?: string;
  subtitle?: string;
  cta?: string;
}
```

Localizar onde a imagem e adicionada ao `chatImages` dentro de `createPipeline`, e adicionar os campos:
```typescript
addChatImage(msgId, {
  url: imageResult.url,
  headline: data.headline,
  subtitle: data.subtitle,
  cta: data.cta,
});
```

Atualizar o `setEditorImage` para incluir os campos:
```typescript
onClick={() => setEditorImage({
  msgId: msg.id,
  idx,
  url: img.url,
  headline: img.headline,
  subtitle: img.subtitle,
  cta: img.cta,
})}
```

**Step 4: Passar os campos ao PostEditorModal**

Localizar (linha ~1029):
```tsx
<PostEditorModal
  imageUrl={editorImage.url}
  open={!!editorImage}
  onClose={() => setEditorImage(null)}
  onSave={...}
/>
```

Adicionar props:
```tsx
<PostEditorModal
  imageUrl={editorImage.url}
  headline={editorImage.headline}
  subtitle={editorImage.subtitle}
  cta={editorImage.cta}
  open={!!editorImage}
  onClose={() => setEditorImage(null)}
  onSave={...}
/>
```

**Step 5: Commit**
```bash
git add components/chat-panel.tsx
git commit -m "feat: add headline/subtitle/cta fields to PostData and editorImage state"
```

---

## Task 2: Atualizar PostEditorModal e PostEditor para receber e exibir os campos de texto

**Files:**
- Modify: `components/post-editor-modal.tsx`
- Modify: `components/post-editor.tsx`

**Step 1: Atualizar PostEditorModal props**

Em `components/post-editor-modal.tsx`, localizar:
```typescript
interface PostEditorModalProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}
```

Substituir por:
```typescript
interface PostEditorModalProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
  headline?: string;
  subtitle?: string;
  cta?: string;
}
```

Atualizar a desestruturacao:
```typescript
export function PostEditorModal({ imageUrl, open, onClose, onSave, headline, subtitle, cta }: PostEditorModalProps) {
```

**Step 2: Passar os campos ao PostEditor**

Localizar onde o `PostEditor` e renderizado no modal:
```tsx
<PostEditor
  ref={editorRef}
  imageUrl={imageUrl}
  displayWidth={displayWidth}
  onSelectionChange={setActiveTextProps}
/>
```

Adicionar um `useEffect` que chame `initWithTextLayers` apos o editor estar ready. Para isso, precisamos saber quando o editor terminou de carregar. A melhor abordagem: chamar via `editorRef` em um `useEffect` que depende de `open`.

```typescript
// Dentro de PostEditorModal, apos o useEffect existente:
useEffect(() => {
  if (!open) return;
  // Aguarda um tick para o editor inicializar
  const timer = setTimeout(() => {
    editorRef.current?.initWithTextLayers({ headline, subtitle, cta });
  }, 300);
  return () => clearTimeout(timer);
}, [open, headline, subtitle, cta]);
```

**Step 3: Adicionar `initWithTextLayers` ao PostEditorHandle e PostEditor**

Em `components/post-editor.tsx`, localizar a interface `PostEditorHandle`:
```typescript
export interface PostEditorHandle {
  addText: () => void;
  updateActiveText: (props: Partial<ActiveTextProps>) => void;
  deleteSelected: () => void;
  exportImage: () => string | null;
}
```

Adicionar o novo metodo:
```typescript
export interface PostEditorHandle {
  addText: () => void;
  updateActiveText: (props: Partial<ActiveTextProps>) => void;
  deleteSelected: () => void;
  exportImage: () => string | null;
  initWithTextLayers: (layers: { headline?: string; subtitle?: string; cta?: string }) => void;
}
```

**Step 4: Implementar `initWithTextLayers` no `useImperativeHandle`**

Adicionar dentro do `useImperativeHandle`, apos os metodos existentes:

```typescript
initWithTextLayers: async ({ headline, subtitle, cta }) => {
  const canvas = fabricCanvasRef.current;
  if (!canvas) return;

  const fabric = await import("fabric");
  await loadGoogleFont("Inter");

  // Remove textboxes existentes antes de adicionar (evita duplicatas)
  const existingTexts = canvas.getObjects("textbox");
  for (const obj of existingTexts) {
    canvas.remove(obj);
  }

  const layers = [
    { text: headline, y: 180, fontSize: 72, label: "headline" },
    { text: subtitle, y: 680, fontSize: 42, label: "subtitle" },
    { text: cta,      y: 880, fontSize: 32, label: "cta" },
  ].filter((l) => l.text);

  for (const layer of layers) {
    const textbox = new fabric.Textbox(layer.text!, {
      left: CANVAS_SIZE / 2,
      top: layer.y,
      originX: "center",
      originY: "center",
      width: 900,
      fontSize: layer.fontSize,
      fontFamily: "Inter",
      fill: "#ffffff",
      textAlign: "center",
      fontWeight: layer.label === "headline" ? "bold" : "normal",
      editable: true,
      shadow: new fabric.Shadow({
        color: "rgba(0,0,0,0.7)",
        blur: 10,
        offsetX: 2,
        offsetY: 2,
      }),
    });
    canvas.add(textbox);
  }

  canvas.renderAll();
},
```

**Step 5: Commit**
```bash
git add components/post-editor-modal.tsx components/post-editor.tsx
git commit -m "feat: pre-populate editor with headline/subtitle/cta as editable text layers"
```

---

## Task 3: Adicionar sufixo "no text" em todos os providers de imagem

**Files:**
- Modify: `app/actions/image/create.ts`

**Step 1: Adicionar a constante NO_TEXT_SUFFIX**

No topo do arquivo, apos os imports:
```typescript
const NO_TEXT_SUFFIX =
  " CRITICAL: Do NOT include any text, titles, subtitles, logos, watermarks, " +
  "typography, captions, labels, or UI overlays of any kind in the image. " +
  "Clean visual background only. No words, no letters.";
```

**Step 2: Aplicar o sufixo em `tryGemini`**

Localizar em `tryGemini` onde o text part e adicionado no modo GENERATE (sem referencias):
```typescript
parts.push({ text: `Generate an image: ${prompt}` });
```

Substituir por:
```typescript
parts.push({ text: `Generate an image: ${prompt}${NO_TEXT_SUFFIX}` });
```

No modo EDIT (com referencias), o sufixo NAO deve ser aplicado pois o usuario pode estar editando uma imagem existente que tem texto intencional.

**Step 3: Aplicar o sufixo em `tryCloudflare`**

Localizar:
```typescript
body: JSON.stringify({ prompt }),
```

Substituir por:
```typescript
body: JSON.stringify({ prompt: prompt + NO_TEXT_SUFFIX }),
```

**Step 4: Aplicar o sufixo em `tryPollinations`**

Localizar:
```typescript
const clean = prompt
  .replace(/[^\w\s,.\-:;!?()]/g, " ")
  ...
```

Adicionar o sufixo ANTES do `clean` ser processado:
```typescript
const promptWithSuffix = prompt + " no text no typography no letters no words";
const clean = promptWithSuffix
  .replace(/[^\w\s,.\-:;!?()]/g, " ")
  ...
```

(Pollinations tem limite de 500 chars e sanitiza o prompt, entao usamos versao simplificada do sufixo)

**Step 5: Commit**
```bash
git add app/actions/image/create.ts
git commit -m "feat: add no-text guardrail suffix to all image generation providers"
```

---

## Task 4: Atualizar o System Prompt da AI

**Files:**
- Modify: `app/api/chat/route.ts`

**Step 1: Atualizar BASE_SYSTEM_PROMPT**

Localizar a secao `## QUANDO GERAR` e adicionar uma secao de REGRAS DO imagePrompt logo apos:

```typescript
const BASE_SYSTEM_PROMPT = `Você é o Post Agent — um diretor criativo de agência premium.

## COMO INTERAGIR

Você é conversacional e direto. Não despeje blocos de texto técnico. Faça perguntas curtas, uma de cada vez, para entender o que o usuário quer.

### Fluxo de conversa:

1. **Entenda o pedido** — Quando o usuário pedir algo, responda de forma curta e faça UMA pergunta por vez:
   - "Qual é a marca/produto?"
   - "Qual o objetivo? Vender, engajar, informar?"
   - "Tem preferência de estilo visual?"
   - "Qual texto quer no post? (headline principal, subtítulo, CTA)"

2. **Monte o briefing completo** — Quando tiver contexto suficiente, apresente um resumo estruturado:
   \`\`\`
   FUNDO VISUAL: [descrição do estilo/cena]
   HEADLINE: [texto principal]
   SUBTÍTULO: [texto secundário, se houver]
   CTA: [chamada para ação]
   LEGENDA: [primeiras palavras...]
   \`\`\`
   Depois pergunte: "Posso criar?"

3. **Gere apenas quando aprovado** — Só inclua o bloco <post-data> quando o usuário confirmar.

### Regras de interação:
- Respostas CURTAS (2-4 linhas no máximo por mensagem)
- UMA pergunta por vez, não faça 5 perguntas de uma vez
- Use tom profissional mas amigável
- Se o usuário já deu bastante contexto (marca, produto, objetivo), pule direto para o briefing
- Se o usuário enviou URL de site, use os dados extraídos e pergunte apenas o que falta
- Se o usuário enviou imagem de referência, reconheça e pergunte o que quer fazer com ela

## QUANDO GERAR

Quando o usuário aprovar, gere o bloco JSON no final da resposta.

## REGRAS ABSOLUTAS DO imagePrompt

O imagePrompt descreve APENAS O FUNDO VISUAL. NUNCA inclua:
- Texto de qualquer tipo (títulos, subtítulos, CTAs, hashtags, slogans)
- Logos, marcas, watermarks
- Tipografia, letras, palavras
- Overlays de UI, botões, caixas de texto

**MOTIVO:** O texto será adicionado pelo usuário no editor como camadas editáveis separadas. Se você colocar texto no imagePrompt, ele fica "colado" na imagem e não pode ser editado.

O imagePrompt DEVE ser técnico e detalhado (200-400 palavras em inglês):
- ESTILO: "Isometric 3D illustration", "Editorial photography", "Cinematic shot", etc.
- COMPOSIÇÃO: ângulo, perspectiva, focal point
- ILUMINAÇÃO: tipo, direção, temperatura
- PALETA: cores hex da marca
- ELEMENTOS: cada objeto visual (SEM texto)
- MOOD: atmosfera
- QUALIDADE: "high detail, smooth surfaces, professional rendering"
- ESPAÇO: deixe áreas limpas (céu, superfície, fundo desfocado) onde o texto será sobreposto

Se o usuário forneceu logo/imagens da marca, inclua: "Preserve the exact brand visual identity as provided in the reference images. No text overlays."

## FORMATO DO JSON

<post-data>
{
  "headline": "texto principal do post (máx 8 palavras)",
  "subtitle": "subtítulo ou complemento (opcional, máx 12 palavras)",
  "cta": "call to action direto (máx 5 palavras)",
  "legenda": "hook forte + corpo + fechamento (2-4 linhas para o caption)",
  "hashtags": ["3-5 hashtags estratégicas"],
  "imagePrompt": "prompt técnico de 200-400 palavras em inglês APENAS descrevendo o fundo visual, SEM qualquer texto"
}
</post-data>

Para CARROSSEL: adicione "slides" com prompts individuais (cada um sem texto).
Para VÍDEO: adicione "type": "video".

## EDIÇÃO DE IMAGEM

Quando o usuário enviar uma imagem e pedir para EDITAR (remover fundo, mudar algo, criar banner COM a foto):

1. NÃO gere um post novo do zero
2. Adicione "action": "edit" no JSON
3. O imagePrompt deve ser uma INSTRUÇÃO DE EDIÇÃO

<post-data>
{
  "action": "edit",
  "headline": "texto principal",
  "subtitle": "subtítulo (opcional)",
  "cta": "call to action",
  "legenda": "legenda do post",
  "hashtags": ["hashtags"],
  "imagePrompt": "INSTRUÇÃO DE EDIÇÃO em inglês (pode referenciar texto existente na imagem se necessário)"
}
</post-data>

REGRA DE OURO: Se mandou foto e quer usar ELA, use "action": "edit". Se quer algo novo inspirado na foto, use o fluxo normal.

## EXEMPLOS DE CONVERSA BOA

Usuário: "cria um post pro meu restaurante"
Agente: "Qual o nome do restaurante e o estilo da comida?"

Usuário: "Pizzaria Bella, pizza artesanal"
Agente: "Qual o objetivo do post? Divulgar o cardápio, uma promoção, ou engajamento geral?"

Usuário: "promoção de terça-feira"
Agente: "Entendi! Aqui está o briefing:

FUNDO VISUAL: Mesa rústica com pizza artesanal saindo do forno, iluminação quente, ambiente aconchegante
HEADLINE: Terça tem desconto especial
SUBTÍTULO: 20% em toda a linha artesanal
CTA: Peça agora
LEGENDA: Toda terça é dia de recompensar quem ama pizza de verdade...

Posso criar?"

Usuário: "sim"
Agente: [gera o <post-data>]`;
```

**Step 2: Commit**
```bash
git add app/api/chat/route.ts
git commit -m "feat: update system prompt to enforce text-free imagePrompt and structured briefing flow"
```

---

## Task 5: Verificacao manual

**Step 1: Iniciar o servidor**
```bash
cd "C:\Users\paios\Desktop\Connet cleaner\instagram-post-generator"
pnpm dev
```

**Step 2: Testar o fluxo completo**
1. Abrir `http://localhost:3000`
2. Pedir um post no chat: "cria um post para uma pizzaria, promoção de terça"
3. Verificar que a AI faz perguntas uma a uma
4. Verificar que a AI apresenta o briefing antes de gerar
5. Confirmar a geracao
6. Verificar que a imagem gerada NAO tem texto embutido
7. Clicar no icone de edicao (lapiz) na imagem
8. Verificar que o modal abre com headline/subtitle/cta como Textboxes editaveis
9. Clicar em um Textbox, editar o texto, mudar fonte/cor
10. Clicar em Save e verificar que a imagem exportada tem o texto

**Step 3: Checar o console por erros**
- Sem erros de TypeScript no terminal
- Sem erros no console do browser

---

## Resumo das Mudancas

| Arquivo | Tipo | O que muda |
|---|---|---|
| `components/chat-panel.tsx` | Modify | PostData + GeneratedImage + editorImage + PostEditorModal props |
| `components/post-editor-modal.tsx` | Modify | Props + useEffect para initWithTextLayers |
| `components/post-editor.tsx` | Modify | PostEditorHandle + initWithTextLayers |
| `app/actions/image/create.ts` | Modify | NO_TEXT_SUFFIX nos 3 providers |
| `app/api/chat/route.ts` | Modify | BASE_SYSTEM_PROMPT completo |
