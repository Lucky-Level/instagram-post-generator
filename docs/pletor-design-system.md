# Pletor Design System — Referência Completa

## Tipografia
- **Font family:** Inter, system-ui, -apple-system, sans-serif
- **Body:** 16px / 400
- **Node labels:** 14px / 400 / muted-foreground
- **Small text:** 12px / 400
- **Tiny labels:** 11px / 400
- **Agent title:** 30px / 400
- **Accent text:** 11px / 400 / orange (#fc660c)

## Cores — Dark Mode (padrão do Pletor)
```css
--background: #0a0a0a;          /* Fundo principal */
--foreground: #fafafa;          /* Texto principal */
--card: #0a0a0a;                /* Fundo dos cards */
--card-foreground: #fafafa;     /* Texto dos cards */
--secondary: #262626;           /* Fundo secundário (inputs, hover) */
--secondary-foreground: #fafafa;
--muted: #262626;               /* Fundo muted */
--muted-foreground: #a3a3a3;    /* Texto muted */
--border: #262626;              /* Bordas */
--border-lighter: #383838;      /* Bordas mais claras */
--input: #262626;               /* Fundo dos inputs */
--accent: #262626;              /* Accent bg */
--accent-foreground: #fafafa;
--destructive: #ef4444;         /* Vermelho de erro */
--brand-2: #291305;             /* Brand dark (fundo do ícone laranja) */
--brand-orange: ???;            /* Brand orange */
```

## Cor de Destaque (Brand)
- **Primary/Brand orange:** `#fc660c` (rgb 252, 102, 12)
- Usado em: botão Run, ícone do chat, links de ação, badge "Popular"
- **chart-5 (= brand):** `#fc660c`

## Cores — Light Mode
```css
--background: #fff;
--foreground: #262626;
--card: #fff;
--card-foreground: #0a0a0a;
--primary: #fc660c;             /* Laranja brand */
--primary-foreground: #fceedb;
--secondary: #f5f5f5;
--muted: #878792;
--muted-foreground: #5e636e;
--border: #e3e3e8;
--sidebar: #fafafa;
```

## Node Cards (Canvas)
```css
background: #fff (light) / #0a0a0a (dark);
border: 1px solid #d2d2da (light) / 1px solid #262626 (dark);
border-radius: 8px;
box-shadow: rgba(0, 0, 0, 0.1) 0px 0px 50px 0px;
```

## Botão "Run"
```css
background: #262626 (dark bg) com texto branco;
color: #fff;
border-radius: 8px;
font-size: 14px;
font-weight: 400;
padding: 8px 16px;
/* Com ícone ▷ à esquerda */
```

## Canvas Background
- Light: `#fafafa` com padrão de dots
- Dark: `#0a0a0a` com padrão de dots sutis

## Sidebar Esquerda (Toolbar vertical)
```
Ícones empilhados verticalmente:
+ (Add node) — botão laranja grande, circular
📷 (Assets)
🔲 (Templates)
🧭 (Learn)
💬 (Ask AI) — ícone laranja
```
- Largura: ~48px
- Fundo: transparente sobre o canvas
- Ícones: 20-24px, cor muted-foreground

## Header do Studio
```
[Logo Pletor] [v] [Nome do agent]     [Test run] [⚙] [💾] [App] [Share]
```
- Altura: ~48px
- Fundo: transparente
- Botões: rounded-lg, secondary bg

## Node Types e suas Labels
| Node | Label | Ícone | Cor do ícone |
|------|-------|-------|-------------|
| Text prompt | "T" | Rosa/vermelho | #e54d6b |
| Upload image | "📷" | Rosa | #e54d6b |
| AI Image | "🖼" | Azul | #4a9eff |
| AI Video | "⊕" | Cinza | #878792 |
| Generate text | "T" | Preto | #262626 |

## Node Upload Image
```
┌──────────────────────────────┐
│ 📷 Upload image              │ ← Label com ícone rosa
├──────────────────────────────┤
│ ┌──────┐ ┌──────┐           │
│ │ img1 │×│ img2 │×          │ ← Grid de thumbnails com X para remover
│ └──────┘ └──────┘           │
│ ┌──────┐                    │
│ │ img3 │×                   │
│ └──────┘                    │
│                              │
│     + Upload more            │ ← Botão de adicionar mais
└──────────────────────────────┘
```

## Node AI Image
```
┌──────────────────────────────┐
│ 🖼 AI image                  │
├──────────────────────────────┤
│ ┌────────────────────────┐   │
│ │                        │   │
│ │    Imagem Gerada       │   │
│ │                        │   │
│ └────────────────────────┘   │
│ ◆ Nano Banana    [▷ Run]    │ ← Modelo + botão Run
└──────────────────────────────┘
```

## Chat Panel (Ask AI)
```
┌──────────────────────────────┐
│ New thread ∨   [✏] [⋯] [📋] │ ← Header
├──────────────────────────────┤
│                              │
│                              │
│    🟠 Hey [Name]            │ ← Saudação com ícone laranja
│                              │
│    I help you build          │
│    workflows and get advice  │
│    on your creative projects.│
│    Ask me anything.          │
│                              │
│                              │
│ ┌────────────────────────┐   │
│ │ Create a product shot  │   │ ← Sugestões (chips)
│ │ workflow               │   │
│ ├────────────────────────┤   │
│ │ Generate ad creatives  │   │
│ │ from a brief           │   │
│ ├────────────────────────┤   │
│ │ Help me pick the right │   │
│ │ model for my project   │   │
│ ├────────────────────────┤   │
│ │ What can I build with  │   │
│ │ Pletor?                │   │
│ └────────────────────────┘   │
│                              │
│ ┌────────────────────────┐   │
│ │ Describe what you want │   │ ← Input
│ │ to do                  │   │
│ ├────────────────────────┤   │
│ │ 📎 Manual  Auto    ↑  │   │ ← Attachment, toggle, send
│ └────────────────────────┘   │
└──────────────────────────────┘
```

## Assets Panel
```
┌──────────────────────────────┐
│ 🟠 Draft agent               │
├──────────────────────────────┤
│ 🔍 Search run history        │
├──────────────────────────────┤
│ [Last runs] [All assets] [≡] │ ← Tabs + filtro
├──────────────────────────────┤
│ YESTERDAY        3 ASSETS    │ ← Agrupamento por data
│ ┌────┐ ┌────┐ ┌────┐       │
│ │img │ │img │ │img │        │
│ └────┘ └────┘ └────┘       │
│                              │
│ THIS WEEK        7 ASSETS    │
│ ┌────┐ ┌────┐ ┌────┐       │
│ │img │ │img │ │img │        │
│ └────┘ └────┘ └────┘       │
│ ┌────┐ ┌────┐ ┌────┐       │
│ │img │ │img │ │img │        │
│ └────┘ └────┘ └────┘       │
│ ┌────┐                      │
│ │img │                      │
│ └────┘                      │
└──────────────────────────────┘
```

## Templates Page
```
Use cases: [Product imagery →] [Static Ads →] [UGC →] [Brand assets →] ...

Filtros: [Level All ∨] [Industry All ∨] [Sort ∨] [🔍 Search]

Cards grid (4 cols):
┌──────────────┐
│  [Popular]   │ ← Badge laranja
│  ┌────→────┐ │
│  │img  img │ │ ← Thumbnail antes→depois
│  └─────────┘ │
│ Title         │
│ Description   │ ← Texto muted
└──────────────┘
```

## Spacing
- **radius:** 0.5rem (8px) — quase tudo
- **padding node:** 16px
- **gap grid:** 8-16px
- **sidebar icon gap:** 8px vertical

## Interactions
- Hover em nodes: borda mais clara
- Drag connections: linhas curvas cinza (#878792)
- Selected: borda laranja (#fc660c)
- Run button hover: bg mais escuro
- Toast: bottom-right, dark bg
