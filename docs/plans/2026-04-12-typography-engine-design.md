# Design: Typography Engine — Fontes, Efeitos, Presets e Logo

**Data:** 2026-04-12
**Status:** Aprovado, aguardando implementacao

---

## Objetivo

Transformar o editor de texto em uma ferramenta capaz de gerar criativos comerciais com:
- Fontes display/decorativas organizadas por categoria
- Efeitos tipograficos profissionais (stroke, shadow, letter-spacing, gradiente)
- Presets de estilo aplicaveis em um clique
- Upload de fonte customizada (.ttf/.woff) diretamente no editor
- Agente sugerindo e aplicando estilos via post-data
- Logo da marca inserida automaticamente com posicao definida pelo agente

---

## Arquitetura Geral

```
post-data (agente) → chat-panel → post-editor-modal → post-editor (Fabric.js)
                                                           ├── logo layer
                                                           ├── headline textbox (com textStyle)
                                                           ├── subtitle textbox (com textStyle)
                                                           └── cta textbox (com textStyle)
```

---

## 1. Google Fonts Expandido + Categorizado

### `lib/google-fonts.ts` — reescrever

Estrutura nova com categorias:

```ts
export const FONT_CATEGORIES = {
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
    "Great Vibes", "Sacramento",
  ],
  "Monospace": [
    "JetBrains Mono", "Fira Code", "Source Code Pro",
  ],
} as const;
```

Funcoes novas:
- `getFontCategories(): string[]` — lista categorias
- `getFontsByCategory(cat: string): string[]` — fonts de uma categoria
- `getAllFonts(): string[]` — flat list (compatibilidade)

### `components/post-editor-toolbar.tsx` — picker categorizado

Dropdown de fonte passa a ter grupos visuais por categoria, com linha separadora entre elas. Cada fonte renderizada na propria tipografia (ja implementado).

---

## 2. Efeitos Tipograficos

### Novos campos em `ActiveTextProps` (`components/post-editor.tsx`)

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
  strokeWidth: number;       // 0 = sem outline. 1-20px
  stroke: string;            // cor do outline. default "#000000"
  shadowColor: string;       // cor da sombra. default "#000000"
  shadowBlur: number;        // 0 = sombra dura, 10-20 = difusa
  shadowOffsetX: number;     // offset horizontal
  shadowOffsetY: number;     // offset vertical
  charSpacing: number;       // letter-spacing em unidades Fabric (-200 a 800)
  lineHeight: number;        // line-height (1.0 a 2.5)
  opacity: number;           // 0 a 1
}
```

### `updateActiveText` em `post-editor.tsx`

Adicionar mapeamento dos novos props para Fabric.js:

```ts
// Shadow: Fabric usa objeto fabric.Shadow
if (props.shadowColor !== undefined || props.shadowBlur !== undefined || ...) {
  obj.set("shadow", new fabric.Shadow({
    color: props.shadowColor ?? activeProps.shadowColor,
    blur: props.shadowBlur ?? activeProps.shadowBlur,
    offsetX: props.shadowOffsetX ?? activeProps.shadowOffsetX,
    offsetY: props.shadowOffsetY ?? activeProps.shadowOffsetY,
  }));
}
// Stroke
if (props.strokeWidth !== undefined) obj.set("strokeWidth", props.strokeWidth);
if (props.stroke !== undefined) obj.set("stroke", props.stroke);
// Letter-spacing
if (props.charSpacing !== undefined) obj.set("charSpacing", props.charSpacing);
// Line height
if (props.lineHeight !== undefined) obj.set("lineHeight", props.lineHeight);
```

### `getActiveTextProps` em `post-editor.tsx`

Ler os novos campos do objeto Fabric selecionado.

---

## 3. UI de Efeitos na Toolbar

### `components/post-editor-toolbar.tsx` — nova secao "Efeitos"

Adicionar apos os botoes de alinhamento:

**Outline:**
- Toggle "O" (ativa/desativa stroke)
- Quando ativo: slider de espessura (1-20) + color picker do stroke

**Sombra:**
- Toggle sombra
- Quando ativo: slider blur (0-30) + slider offset X (-20 a 20) + slider offset Y (-20 a 20)
- Color picker da sombra

**Espacamento:**
- Slider letter-spacing (-200 a 800)

**Opacidade:**
- Slider 0-100%

---

## 4. Presets de Estilo

### Definicao em `lib/text-style-presets.ts` (novo arquivo)

```ts
export interface TextStylePreset {
  name: string;
  fontFamily: string;
  fontSize: number;
  fontWeight: string;
  fill: string;
  stroke: string;
  strokeWidth: number;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  charSpacing: number;
}

export const TEXT_STYLE_PRESETS: TextStylePreset[] = [
  {
    name: "Impact",
    fontFamily: "Bebas Neue",
    fontSize: 96,
    fontWeight: "normal",
    fill: "#FFFFFF",
    stroke: "#000000",
    strokeWidth: 3,
    shadowColor: "rgba(0,0,0,0.8)",
    shadowBlur: 0,
    shadowOffsetX: 4,
    shadowOffsetY: 4,
    charSpacing: -20,
  },
  {
    name: "Elegante",
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
  },
  {
    name: "Moderno",
    fontFamily: "Space Grotesk",
    fontSize: 64,
    fontWeight: "bold",
    fill: "#FFFFFF",
    stroke: "",
    strokeWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    charSpacing: -10,
  },
  {
    name: "Vintage",
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
  },
  {
    name: "Script",
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
  },
  {
    name: "Minimal",
    fontFamily: "Inter",
    fontSize: 56,
    fontWeight: "300",
    fill: "#FFFFFF",
    stroke: "",
    strokeWidth: 0,
    shadowColor: "",
    shadowBlur: 0,
    shadowOffsetX: 0,
    shadowOffsetY: 0,
    charSpacing: 200,
  },
];
```

### UI na toolbar

Botao "Estilos" (icona Sparkles) abre popover com cards dos presets.
Cada card: nome + preview visual do nome no proprio estilo do preset.
Clicar aplica todos os props ao textbox selecionado.

---

## 5. Upload de Fonte Customizada

### Fluxo

1. Botao "Upload fonte" na toolbar (icone Upload)
2. File picker: aceita `.ttf`, `.woff`, `.woff2`
3. Upload para Supabase Storage (bucket `brand-assets`, path `fonts/{agentId}/{filename}`)
4. Registrar no browser via `FontFace API`:
   ```ts
   const font = new FontFace(fontName, `url(${publicUrl})`);
   await font.load();
   document.fonts.add(font);
   ```
5. Adicionar font ao topo da lista do picker (secao "Minhas Fontes")
6. Salvar no `font_library` (Supabase) para persistir entre sessoes

### API necessaria

`POST /api/upload-font` — recebe o arquivo, faz upload no Storage, retorna URL publica e nome da fonte.

### Persistencia

`font_library` ja existe. Inserir `{ agent_id, family: fontName, source: "upload", url: publicUrl }`.

Ao abrir o editor, carregar fontes customizadas do agente antes de renderizar.

---

## 6. Agente Sugere Estilos via post-data

### Novo campo `textStyles` no post-data

```json
{
  "imagePrompt": "...",
  "headline": "Dos Tacos",
  "subtitle": "Mexican Cuisine",
  "cta": "Venha provar",
  "logo": { "x": 60, "y": 60, "width": 180 },
  "textStyles": {
    "headline": {
      "preset": "Impact",
      "fontFamily": "Dela Gothic One",
      "charSpacing": -30
    },
    "subtitle": {
      "preset": "Minimal",
      "fontSize": 28
    }
  },
  "legenda": "...",
  "hashtags": []
}
```

O agente pode referenciar um preset por nome e sobrescrever campos especificos.
Se `preset` for informado, os valores do preset sao base; campos extras fazem override.

### `initWithTextLayers` em `post-editor.tsx`

Recebe `textStyles?: { headline?: TextStyleOverride; subtitle?: TextStyleOverride; cta?: TextStyleOverride }`.
Ao criar cada Textbox, resolve o estilo: preset base + overrides + aplica via `obj.set(...)`.

### `BASE_SYSTEM_PROMPT` em `app/api/chat/route.ts`

Adicionar:
- Lista dos presets disponíveis pelo nome
- Instrucao: usar `textStyles` para sugerir estilos condizentes com a marca
- Instrucao: `fontFamily` deve ser uma das fontes da lista (ou fonte customizada do brand_kit)
- Logo: incluir campo `logo` se o brand agent tiver logo no brand_kit

---

## 7. Logo Auto-Insercao (ja desenhado em 2026-04-12-logo-auto-insertion-design.md)

Consolidado aqui: `initWithTextLayers` recebe `logoUrl?` e `logoPosition?`, insere como camada Fabric.Image com drag liberado e rotacao bloqueada.

---

## Ordem de Implementacao (Tasks)

1. **Task 1** — Expandir fontes + picker categorizado (`lib/google-fonts.ts` + `post-editor-toolbar.tsx`)
2. **Task 2** — Novos campos em `ActiveTextProps` + `updateActiveText` + `getActiveTextProps` (`post-editor.tsx`)
3. **Task 3** — UI de efeitos na toolbar (stroke, shadow, letter-spacing, opacity)
4. **Task 4** — Presets de estilo (`lib/text-style-presets.ts` + UI na toolbar)
5. **Task 5** — Upload de fonte customizada (toolbar + `/api/upload-font` + `font_library`)
6. **Task 6** — Agente sugere estilos: `textStyles` no post-data + `initWithTextLayers` aplica
7. **Task 7** — Logo auto-insercao: `logoUrl` + `logoPosition` em `initWithTextLayers`
