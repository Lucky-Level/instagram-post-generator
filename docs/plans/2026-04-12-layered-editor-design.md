# Design: Layered Editor -- AI Background + Editable Text Layers

**Data:** 2026-04-12
**Status:** Aprovado, aguardando implementacao

---

## Problema

A AI gera imagens com texto embutido (baked in), tornando impossivel a edicao posterior.
O diferencial da plataforma -- editor com camadas separadas -- estava sendo desperdicado.

---

## Principio Central

> A AI e responsavel pelo **fundo visual**. O editor e responsavel pelo **texto e elementos**.

---

## Fluxo Correto

```
1. Usuario descreve o post
2. AI faz perguntas UMA A UMA (marca, objetivo, estilo, cores, textos desejados)
3. AI apresenta BRIEFING COMPLETO para aprovacao do usuario
4. Usuario aprova (ou ajusta)
5. AI gera <post-data> com:
   - imagePrompt: APENAS o fundo visual (sem nenhum texto)
   - headline, subtitle, cta como campos separados
6. Editor abre com background da AI + Textboxes pre-populados e editaveis
7. Usuario ajusta fonte, cor, tamanho, posicao livremente
```

---

## Formato <post-data> Atualizado

```json
{
  "imagePrompt": "cinematic coffee shop interior, warm golden bokeh light, dark wood surfaces...",
  "headline": "Segunda e dia de recompensar",
  "subtitle": "20% off em todos os drinks",
  "cta": "Venha nos visitar",
  "legenda": "legenda completa para o Instagram...",
  "hashtags": ["#cafe", "#artesanal", "#promo"]
}
```

---

## Posicionamento Default dos Textboxes

| Campo    | Y (canvas 1080px) | Fonte | Cor default         |
|----------|-------------------|-------|---------------------|
| headline | 180               | 72px  | #FFFFFF             |
| subtitle | 680               | 42px  | #FFFFFF             |
| cta      | 880               | 32px  | rgba(255,255,255,.85) |

Todos editaveis: drag, resize, fonte, cor, bold, italic, delete, adicionar novos.

---

## Mudancas de Codigo (Atomicas)

### 1. `app/api/chat/route.ts` -- BASE_SYSTEM_PROMPT
- Adicionar regra: imagePrompt NUNCA contem texto, tipografia, logos, marcas d'agua
- Adicionar fluxo de briefing obrigatorio antes de gerar
- Briefing deve mostrar: fundo visual + headline + subtitle + cta para aprovacao

### 2. `app/actions/image/create.ts` -- todos os providers
- Adicionar sufixo hardcoded ao prompt antes de qualquer provider:
  `"CRITICAL: No text, no titles, no subtitles, no logos, no watermarks, no typography. Clean visual background only."`

### 3. `components/post-editor.tsx`
- Adicionar metodo `initWithTextLayers({ headline?, subtitle?, cta? })` no handle
- Instancia Textboxes pre-posicionados conforme tabela acima
- Fundo continua como `canvas.backgroundImage` (nao-selecionavel)

### 4. `components/post-editor-modal.tsx`
- Receber e passar `headline`, `subtitle`, `cta` como props
- Chamar `initWithTextLayers` apos o editor estar ready

### 5. Frontend (onde o <post-data> e parseado)
- Extrair os campos `headline`, `subtitle`, `cta` do JSON
- Passar para o modal do editor

---

## Guardrail Dupla

- **LLM**: instruido a nunca incluir texto no imagePrompt
- **Provider**: sufixo "no text" adicionado a todos os prompts de geracao

Se um falhar, o outro segura.

---

## Fase Futura (Prioridade B): Editor Completo

- Shapes (retangulo, circulo, linha)
- Undo/Redo (historico de estados)
- Painel de camadas (reordenar, ocultar, travar)
- Opacidade por elemento
- Stroke/contorno em texto
- Espacamento entre letras e linhas
- Background color / gradiente
- Stickers e icones SVG
