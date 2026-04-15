"use client";

import { useAtom } from "jotai";
import { useAtomValue } from "jotai";
import { useEffect, useRef, useState } from "react";
import {
  ImageIcon,
  LayoutTemplateIcon,
  LayersIcon,
  PaletteIcon,
  ShapesIcon,
  TypeIcon,
  UploadIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type EditorTab,
  editorAgentIdAtom,
  editorHandleAtom,
  editorTabAtom,
} from "@/lib/editor-state";
import { TEXT_STYLE_PRESETS } from "@/lib/text-style-presets";
import { getAssets, type Asset } from "@/lib/asset-storage";

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
      return <ImagesTab />;
    case "shapes":
      return <ShapesTab />;
    case "brand":
      return <BrandTab />;
    case "layers":
      return <PlaceholderTab title="Layers" />;
  }
}

/* ─────────── Text Tab ─────────── */

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

/* ─────────── Images Tab ─────────── */

function ImagesTab() {
  const editorHandle = useAtomValue(editorHandleAtom);
  const [prompt, setPrompt] = useState("");
  const [generating, setGenerating] = useState(false);
  const [assets, setAssets] = useState<Asset[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const stored = getAssets();
    setAssets(stored.filter((a) => a.type === "image").slice(0, 12));
  }, []);

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      editorHandle?.addImage(dataUrl);
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const handleGenerate = async (asBackground = true) => {
    if (!prompt.trim() || generating) return;
    setGenerating(true);
    try {
      const { generateImageAction } = await import("@/app/actions/image/create");
      const result = await generateImageAction({
        prompt: prompt.trim(),
        modelId: "auto",
      });
      if ("error" in result) {
        const { toast } = await import("sonner");
        toast.error(result.error);
        return;
      }
      if (asBackground) {
        editorHandle?.setBackground(result.url);
      } else {
        editorHandle?.addImage(result.url);
      }
      setPrompt("");
    } catch {
      const { toast } = await import("sonner");
      toast.error("Erro ao gerar imagem");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* Upload */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Upload</h3>
        <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        <button
          onClick={() => fileRef.current?.click()}
          className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
        >
          <UploadIcon className="size-4" />
          Enviar imagem
        </button>
      </div>

      {/* AI Generate */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Gerar com AI</h3>
        <div className="space-y-2">
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Descreva a imagem..."
            rows={2}
            className="w-full rounded-md border border-border bg-secondary/50 px-2 py-1.5 text-xs outline-none focus:ring-1 focus:ring-primary/50 resize-none"
          />
          <button
            onClick={() => handleGenerate(true)}
            disabled={!prompt.trim() || generating}
            className="w-full rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
          >
            {generating ? "Gerando..." : "Gerar como fundo"}
          </button>
          <button
            onClick={() => handleGenerate(false)}
            disabled={!prompt.trim() || generating}
            className="w-full rounded-md border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-secondary/60 transition-colors disabled:opacity-50"
          >
            Adicionar como elemento
          </button>
        </div>
      </div>

      {/* Gallery */}
      {assets.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Recentes</h3>
          <div className="grid grid-cols-2 gap-1.5">
            {assets.map((asset) => (
              <button
                key={asset.id}
                onClick={() => editorHandle?.addImage(asset.url)}
                className="overflow-hidden rounded-md border border-border hover:border-primary/50 transition-colors aspect-square"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={asset.url} alt="" className="size-full object-cover" />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Shapes Tab ─────────── */

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

/* ─────────── Brand Kit Tab ─────────── */

function BrandTab() {
  const editorHandle = useAtomValue(editorHandleAtom);
  const agentId = useAtomValue(editorAgentIdAtom);
  const [agent, setAgent] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!agentId) return;
    setLoading(true);
    fetch(`/api/brand-agents/${agentId}`)
      .then((r) => r.json())
      .then((data: Record<string, unknown>) => setAgent(data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [agentId]);

  if (loading) return <p className="text-xs text-muted-foreground">Carregando...</p>;
  if (!agent) return <p className="text-xs text-muted-foreground">Selecione um Brand Agent</p>;

  const brandKit = (agent.brand_kit as Record<string, unknown>) || {};
  const colors = (brandKit.colors as Record<string, string>) || {};
  const fonts = (agent.fonts as Array<{ family: string; role?: string; category?: string }>) || [];
  const logos = brandKit.logos as string[] | undefined;
  const logoUrl = logos?.[0];

  return (
    <div className="space-y-4">
      {/* Logo */}
      {logoUrl && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Logo</h3>
          <button
            onClick={() => editorHandle?.addImage(logoUrl)}
            className="overflow-hidden rounded-lg border border-border p-2 hover:border-primary/50 transition-colors"
            title="Adicionar ao canvas"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
          </button>
        </div>
      )}

      {/* Colors */}
      <div>
        <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Cores</h3>
        {Object.keys(colors).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {Object.entries(colors).map(([key, color]) => (
              <button
                key={key}
                onClick={() => editorHandle?.updateActiveText({ fill: color })}
                title={`${key}: ${color}`}
                className="flex flex-col items-center gap-1"
              >
                <div
                  className="size-8 rounded-md border border-border hover:ring-2 hover:ring-primary/50 transition-all"
                  style={{ backgroundColor: color }}
                />
                <span className="text-[9px] text-muted-foreground capitalize">{key}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">Nenhuma cor definida</p>
        )}
      </div>

      {/* Fonts */}
      {fonts.length > 0 && (
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">Fontes</h3>
          <div className="space-y-1.5">
            {fonts.map((f) => (
              <button
                key={f.family}
                onClick={async () => {
                  const { loadGoogleFont } = await import("@/lib/google-fonts");
                  await loadGoogleFont(f.family);
                  editorHandle?.updateActiveText({ fontFamily: f.family });
                }}
                className="w-full rounded-lg border border-border px-3 py-2 text-left hover:bg-secondary/60 transition-colors"
              >
                <span className="text-sm">{f.family}</span>
                <span className="ml-2 text-[10px] text-muted-foreground capitalize">{f.role || f.category}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─────────── Placeholder Tab ─────────── */

function PlaceholderTab({ title }: { title: string }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{title}</h3>
      <p className="text-xs text-muted-foreground">Em breve</p>
    </div>
  );
}
