# Design: Logo Auto-Insertion como Camada Fabric.js

**Data:** 2026-04-12
**Status:** Aprovado, aguardando implementacao

---

## Principio

O agente decide o posicionamento da logo no briefing. O editor insere a logo como camada Fabric.js arrastável automaticamente ao abrir.

---

## Formato post-data Atualizado

```json
{
  "imagePrompt": "...",
  "headline": "Segunda e dia de recompensar",
  "subtitle": "20% off em todos os drinks",
  "cta": "Venha nos visitar",
  "logo": {
    "x": 60,
    "y": 60,
    "width": 200
  },
  "legenda": "...",
  "hashtags": []
}
```

- `x`, `y`: coordenadas top-left no canvas 1080x1080
- `width`: largura em pixels. Height calculado proporcionalmente.
- Campo `logo` só aparece se o brand agent tiver `brand_kit.logos[0]` preenchido
- O agente NAO inclui logo no `imagePrompt` — ela e inserida como camada separada

---

## Restricoes para o Agente

- Canvas: 1080x1080px
- Texto fixo: headline y≈180, subtitle y≈680, cta y≈880
- Logo NAO deve sobrepor texto
- Posicoes comuns:
  - Topo esquerdo: x=60, y=60
  - Topo direito: x=820, y=60 (width 200 = ate 1020)
  - Topo centro: x=440, y=60
  - Base esquerda: x=60, y=960
  - Base direita: x=820, y=960
- Width recomendado: 120 (discreta) a 280 (protagonista)

---

## Mudancas de Codigo

### 1. `app/api/chat/route.ts`
- Adicionar ao `BASE_SYSTEM_PROMPT`:
  - No briefing: perguntar posicao da logo se `brand_kit.logos` existir
  - No schema post-data: documentar campo `logo: { x, y, width }`
  - Regra: logo nunca sobrepos texto, nunca aparece no imagePrompt

### 2. `components/chat-panel.tsx`
- Interface `GeneratedImage`: adicionar `logo?: { x: number; y: number; width: number }`
- `addChatImage`: extrair `logo` do post-data parsed e incluir no estado

### 3. `components/post-editor-modal.tsx`
- Props: adicionar `logoUrl?: string` e `logoPosition?: { x: number; y: number; width: number }`
- Passar ambos para `initWithTextLayers` via `handleReady`

### 4. `components/post-editor.tsx`
- `PostEditorHandle.initWithTextLayers`: receber `logoUrl?` e `logoPosition?`
- Implementacao:
  ```ts
  if (logoUrl && logoPosition) {
    const img = await fabric.Image.fromURL(logoUrl, { crossOrigin: "anonymous" });
    const scaleX = logoPosition.width / img.width!;
    img.set({
      left: logoPosition.x,
      top: logoPosition.y,
      scaleX,
      scaleY: scaleX,
      selectable: true,
      hasControls: true,
      lockRotation: true,
    });
    canvas.add(img);
  }
  ```

---

## Comportamento no Editor

- Logo inserida como camada normal: drag + resize liberados
- Rotacao bloqueada (`lockRotation: true`)
- Pode ser deletada como qualquer outro objeto
- Renderizada acima do background, abaixo ou acima do texto (ultima camada adicionada = topo)
