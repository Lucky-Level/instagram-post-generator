"use client";

import { useAtom } from "jotai";
import {
  ImageIcon,
  LayoutTemplateIcon,
  LayersIcon,
  PaletteIcon,
  ShapesIcon,
  TypeIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type EditorTab, editorTabAtom } from "@/lib/editor-state";

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
      return <PlaceholderTab title="Textos" />;
    case "images":
      return <PlaceholderTab title="Imagens" />;
    case "shapes":
      return <PlaceholderTab title="Shapes" />;
    case "brand":
      return <PlaceholderTab title="Brand Kit" />;
    case "layers":
      return <PlaceholderTab title="Layers" />;
  }
}

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">Em breve</p>
    </div>
  );
}
