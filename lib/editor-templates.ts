export interface TemplateObject {
  type: "textbox" | "rect" | "circle" | "triangle" | "line";
  props: Record<string, any>;
}

export interface EditorTemplate {
  id: string;
  name: string;
  category: "feed" | "stories" | "ads" | "minimal" | "bold";
  objects: TemplateObject[];
}

export const EDITOR_TEMPLATES: EditorTemplate[] = [
  {
    id: "clean-feed",
    name: "Clean Feed",
    category: "feed",
    objects: [
      { type: "textbox", props: { text: "Seu Titulo Aqui", left: 540, top: 200, originX: "center", originY: "center", width: 800, fontSize: 72, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", shadow: { color: "rgba(0,0,0,0.6)", blur: 10, offsetX: 2, offsetY: 2 } } },
      { type: "textbox", props: { text: "Subtitulo descritivo do post", left: 540, top: 680, originX: "center", originY: "center", width: 700, fontSize: 36, fontFamily: "Inter", fill: "#ffffffcc", fontWeight: "normal", textAlign: "center" } },
      { type: "textbox", props: { text: "SAIBA MAIS", left: 540, top: 880, originX: "center", originY: "center", width: 300, fontSize: 28, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", charSpacing: 200 } },
    ],
  },
  {
    id: "bold-impact",
    name: "Bold Impact",
    category: "bold",
    objects: [
      { type: "rect", props: { left: 0, top: 0, width: 1080, height: 1080, fill: "rgba(0,0,0,0.55)", selectable: false } },
      { type: "textbox", props: { text: "HEADLINE\nGRANDE", left: 540, top: 400, originX: "center", originY: "center", width: 900, fontSize: 96, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", lineHeight: 1.0 } },
      { type: "textbox", props: { text: "Descricao curta do conteudo", left: 540, top: 700, originX: "center", originY: "center", width: 700, fontSize: 32, fontFamily: "Inter", fill: "#ffffffbb", textAlign: "center" } },
    ],
  },
  {
    id: "minimal",
    name: "Minimal",
    category: "minimal",
    objects: [
      { type: "textbox", props: { text: "titulo minimalista", left: 80, top: 900, originX: "left", originY: "center", width: 500, fontSize: 40, fontFamily: "Inter", fill: "#ffffff", fontWeight: "300", textAlign: "left" } },
    ],
  },
  {
    id: "sale-banner",
    name: "Sale Banner",
    category: "ads",
    objects: [
      { type: "rect", props: { left: 540, top: 540, originX: "center", originY: "center", width: 1080, height: 1080, fill: "rgba(0,0,0,0.4)" } },
      { type: "circle", props: { left: 540, top: 350, originX: "center", originY: "center", radius: 140, fill: "#ff3b30" } },
      { type: "textbox", props: { text: "50%\nOFF", left: 540, top: 350, originX: "center", originY: "center", width: 250, fontSize: 56, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", lineHeight: 1.0 } },
      { type: "textbox", props: { text: "MEGA SALE", left: 540, top: 620, originX: "center", originY: "center", width: 800, fontSize: 80, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", charSpacing: 100 } },
      { type: "textbox", props: { text: "COMPRE AGORA", left: 540, top: 880, originX: "center", originY: "center", width: 400, fontSize: 28, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", charSpacing: 300 } },
    ],
  },
  {
    id: "story-vertical",
    name: "Story Vertical",
    category: "stories",
    objects: [
      { type: "textbox", props: { text: "TITULO TOP", left: 540, top: 150, originX: "center", originY: "center", width: 800, fontSize: 48, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center" } },
      { type: "textbox", props: { text: "Arraste para cima", left: 540, top: 1750, originX: "center", originY: "center", width: 500, fontSize: 24, fontFamily: "Inter", fill: "#ffffffaa", textAlign: "center", charSpacing: 100 } },
    ],
  },
  {
    id: "quote-card",
    name: "Quote Card",
    category: "minimal",
    objects: [
      { type: "textbox", props: { text: '"Sua citacao inspiradora vai aqui. Faca ela impactante."', left: 540, top: 450, originX: "center", originY: "center", width: 800, fontSize: 48, fontFamily: "Inter", fill: "#ffffff", fontWeight: "300", fontStyle: "italic", textAlign: "center", lineHeight: 1.4 } },
      { type: "textbox", props: { text: "-- Nome do Autor", left: 540, top: 750, originX: "center", originY: "center", width: 400, fontSize: 24, fontFamily: "Inter", fill: "#ffffff99", textAlign: "center" } },
    ],
  },
  {
    id: "split-layout",
    name: "Split Layout",
    category: "feed",
    objects: [
      { type: "rect", props: { left: 0, top: 0, width: 540, height: 1080, fill: "rgba(0,0,0,0.7)" } },
      { type: "textbox", props: { text: "TITULO\nDO POST", left: 270, top: 400, originX: "center", originY: "center", width: 460, fontSize: 64, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", lineHeight: 1.1 } },
      { type: "textbox", props: { text: "Descricao breve", left: 270, top: 600, originX: "center", originY: "center", width: 400, fontSize: 24, fontFamily: "Inter", fill: "#ffffffbb", textAlign: "center" } },
    ],
  },
  {
    id: "gradient-overlay",
    name: "Gradient Bottom",
    category: "feed",
    objects: [
      { type: "rect", props: { left: 0, top: 700, width: 1080, height: 380, fill: "rgba(0,0,0,0.7)" } },
      { type: "textbox", props: { text: "Titulo do Post", left: 540, top: 800, originX: "center", originY: "center", width: 900, fontSize: 56, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center" } },
      { type: "textbox", props: { text: "Descricao complementar aqui", left: 540, top: 920, originX: "center", originY: "center", width: 800, fontSize: 28, fontFamily: "Inter", fill: "#ffffffcc", textAlign: "center" } },
    ],
  },
  {
    id: "frame-border",
    name: "Frame",
    category: "minimal",
    objects: [
      { type: "rect", props: { left: 540, top: 540, originX: "center", originY: "center", width: 980, height: 980, fill: "transparent", stroke: "#ffffff", strokeWidth: 3 } },
      { type: "textbox", props: { text: "SEU CONTEUDO", left: 540, top: 500, originX: "center", originY: "center", width: 700, fontSize: 60, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center" } },
      { type: "textbox", props: { text: "www.suamarca.com", left: 540, top: 950, originX: "center", originY: "center", width: 400, fontSize: 18, fontFamily: "Inter", fill: "#ffffff99", textAlign: "center", charSpacing: 200 } },
    ],
  },
  {
    id: "product-spotlight",
    name: "Product Spotlight",
    category: "ads",
    objects: [
      { type: "rect", props: { left: 540, top: 540, originX: "center", originY: "center", width: 1080, height: 1080, fill: "rgba(0,0,0,0.35)" } },
      { type: "textbox", props: { text: "NOVO", left: 540, top: 150, originX: "center", originY: "center", width: 300, fontSize: 24, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center", charSpacing: 500 } },
      { type: "textbox", props: { text: "Nome do Produto", left: 540, top: 750, originX: "center", originY: "center", width: 800, fontSize: 56, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center" } },
      { type: "textbox", props: { text: "R$ 99,90", left: 540, top: 870, originX: "center", originY: "center", width: 400, fontSize: 40, fontFamily: "Inter", fill: "#ffffff", fontWeight: "bold", textAlign: "center" } },
    ],
  },
];

export function getTemplatesByCategory(category?: string): EditorTemplate[] {
  if (!category || category === "all") return EDITOR_TEMPLATES;
  return EDITOR_TEMPLATES.filter((t) => t.category === category);
}
