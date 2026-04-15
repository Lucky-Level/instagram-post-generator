"use client";

import { useAtom } from "jotai";
import { useAtomValue } from "jotai";
import {
  ImageIcon,
  LayoutTemplateIcon,
  LayersIcon,
  PaletteIcon,
  ShapesIcon,
  TypeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type EditorTab, editorHandleAtom, editorTabAtom } from "@/lib/editor-state";
import { TEXT_STYLE_PRESETS } from "@/lib/text-style-presets";

const TABS: { id: EditorTab; icon: typeof TypeIcon; label: string }[] = [
  { id: "templates", icon: LayoutTemplateIcon, label: "Templates" },
  { id: "text", icon: TypeIcon, label: "Textos" },
  { id: "images", icon: ImageIcon, label: "Imagens" },
  { id: "shapes", icon: ShapesIcon, label: "Shapes" },
  { id: "brand", icon: PaletteIcon, label: "Brand Kit" },
  { id: "layers", icon: LayersIcon, label: "Layers" },
];

export function EditorSidebar() {
  const [activeTab, setActiveTab] = useAtom(editorTabAtom);

  return (
    <div className="flex h-full border-r border-border bg-background">
      {/* Icon rail */}
      <div className="flex w-12 shrink-0 flex-col items-center gap-1 border-r border-border bg-secondary/30 py-2">
        {TABS.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            title={label}
            className={cn(
              "flex size-10 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground",
              activeTab === id && "bg-secondary text-foreground",
            )}
          >
            <Icon className="size-4" />
          </button>
        ))}
      </div>

      {/* Panel content area */}
      <div className="w-[220px] overflow-y-auto p-3">
        <TabContent tab={activeTab} />
      </div>
    </div>
  );
}

function TabContent({ tab }: { tab: EditorTab }) {
  switch (tab) {
    case "templates":
      return <PlaceholderTab title="Templates" />;
    case "text":
      return <TextTab />;
    case "images":
      return <PlaceholderTab title="Imagens" />;
    case "shapes":
      return <ShapesTab />;
    case "brand":
      return <PlaceholderTab title="Brand Kit" />;
    case "layers":
      return <PlaceholderTab title="Layers" />;
  }
}

function TextTab() {
  const editorHandle = useAtomValue(editorHandleAtom);

  const addHeadline = () => {
    editorHandle?.addText();
    setTimeout(() => {
      editorHandle?.updateActiveText({ fontSize: 72, fontWeight: "bold" });
    }, 50);
  };

  const addSubtitle = () => {
    editorHandle?.addText();
    setTimeout(() => {
      editorHandle?.updateActiveText({ fontSize: 42, fontWeight: "normal" });
    }, 50);
  };

  const addBody = () => {
    editorHandle?.addText();
    setTimeout(() => {
      editorHandle?.updateActiveText({ fontSize: 24, fontWeight: "normal" });
    }, 50);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Adicionar Texto</h3>
      <div className="space-y-2">
        <button onClick={addHeadline} className="w-full rounded-lg border border-border p-3 text-left hover:bg-secondary/60 transition-colors">
          <span className="text-lg font-bold text-foreground">Titulo</span>
        </button>
        <button onClick={addSubtitle} className="w-full rounded-lg border border-border p-3 text-left hover:bg-secondary/60 transition-colors">
          <span className="text-sm font-medium text-foreground">Subtitulo</span>
        </button>
        <button onClick={addBody} className="w-full rounded-lg border border-border p-3 text-left hover:bg-secondary/60 transition-colors">
          <span className="text-xs text-muted-foreground">Corpo de texto</span>
        </button>
      </div>

      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground pt-2">Estilos Prontos</h3>
      <div className="space-y-1.5">
        {TEXT_STYLE_PRESETS.map((preset) => (
          <button
            key={preset.name}
            onClick={async () => {
              if (preset.style.fontFamily) {
                const { loadGoogleFont } = await import("@/lib/google-fonts");
                await loadGoogleFont(preset.style.fontFamily);
              }
              editorHandle?.updateActiveText(preset.style);
            }}
            className="w-full rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-secondary/60"
          >
            <span className="text-sm">{preset.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function ShapesTab() {
  const editorHandle = useAtomValue(editorHandleAtom);

  const shapes = [
    { type: "rect" as const, label: "Retangulo", icon: "\u25A1" },
    { type: "circle" as const, label: "Circulo", icon: "\u25CB" },
    { type: "triangle" as const, label: "Triangulo", icon: "\u25B3" },
    { type: "line" as const, label: "Linha", icon: "\u2500" },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Formas</h3>
      <div className="grid grid-cols-2 gap-2">
        {shapes.map(({ type, label, icon }) => (
          <button
            key={type}
            onClick={() => editorHandle?.addShape(type)}
            title={label}
            className="flex flex-col items-center gap-1.5 rounded-lg border border-border p-3 text-muted-foreground transition-colors hover:bg-secondary/60 hover:text-foreground"
          >
            <span className="text-2xl leading-none">{icon}</span>
            <span className="text-[10px]">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">Em breve</p>
    </div>
  );
}
