"use client";

import { useReactFlow } from "@xyflow/react";
import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  Loader2Icon,
  MessageCircleIcon,
  PlusIcon,
} from "lucide-react";
import Image from "next/image";
import { memo, useCallback, useEffect, useState } from "react";
import { toast } from "sonner";
import { nodeButtons } from "@/lib/node-buttons";
import { useNodeOperations } from "@/providers/node-operations";
import { Panel } from "./ai-elements/panel";
import { Button } from "./ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

interface CreativeAsset {
  id: string;
  base_image_url: string | null;
  final_image_url: string | null;
  platform: string;
  caption: string | null;
  created_at: string;
}

interface ToolbarProps {
  onToggleChat?: () => void;
}

export const ToolbarInner = ({ onToggleChat }: ToolbarProps) => {
  const { getViewport } = useReactFlow();
  const { addNode } = useNodeOperations();
  const [activePanel, setActivePanel] = useState<"assets" | "templates" | null>(null);
  const [assets, setAssets] = useState<CreativeAsset[]>([]);
  const [loadingAssets, setLoadingAssets] = useState(false);

  const handleAddNode = (type: string) => {
    const viewport = getViewport();
    const centerX =
      -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
    const centerY =
      -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
    addNode(type, { position: { x: centerX, y: centerY } });
  };

  const loadAssets = useCallback(async () => {
    setLoadingAssets(true);
    try {
      const agentId = localStorage.getItem("active_agent_id");
      const url = agentId
        ? `/api/creative-assets?agent_id=${agentId}&limit=20`
        : "/api/creative-assets?limit=20";
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setAssets(Array.isArray(data) ? data : []);
      }
    } catch {
      // silent
    } finally {
      setLoadingAssets(false);
    }
  }, []);

  useEffect(() => {
    if (activePanel === "assets") {
      loadAssets();
    }
  }, [activePanel, loadAssets]);

  const handleUseAsset = (asset: CreativeAsset) => {
    const imageUrl = asset.final_image_url || asset.base_image_url;
    if (!imageUrl) return;

    const viewport = getViewport();
    const centerX = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
    const centerY = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;

    addNode("image", {
      position: { x: centerX, y: centerY },
      data: {
        generated: { url: imageUrl, type: "image/png" },
        description: asset.caption || asset.platform,
        updatedAt: new Date().toISOString(),
      },
    });

    setActivePanel(null);
    toast.success("Asset adicionado ao canvas");
  };

  const templatePresets = [
    { label: "Post + Legenda", desc: "Texto + imagem conectados", action: () => {
      const viewport = getViewport();
      const cx = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const cy = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
      const textId = addNode("text", { position: { x: cx - 200, y: cy } });
      const imgId = addNode("image", { position: { x: cx + 200, y: cy } });
      if (textId && imgId) {
        toast.success("Template adicionado");
      }
      setActivePanel(null);
    }},
    { label: "Carrossel 3 slides", desc: "3 imagens com texto guia", action: () => {
      const viewport = getViewport();
      const cx = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const cy = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
      addNode("text", { position: { x: cx - 250, y: cy } });
      addNode("image", { position: { x: cx + 150, y: cy - 200 } });
      addNode("image", { position: { x: cx + 150, y: cy + 50 } });
      addNode("image", { position: { x: cx + 150, y: cy + 300 } });
      toast.success("Template carrossel adicionado");
      setActivePanel(null);
    }},
    { label: "Antes / Depois", desc: "Duas imagens lado a lado", action: () => {
      const viewport = getViewport();
      const cx = -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
      const cy = -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
      addNode("image", { position: { x: cx - 150, y: cy }, data: { instructions: "Imagem ANTES" } });
      addNode("image", { position: { x: cx + 250, y: cy }, data: { instructions: "Imagem DEPOIS" } });
      toast.success("Template adicionado");
      setActivePanel(null);
    }},
  ];

  const togglePanel = (panel: "assets" | "templates") => {
    setActivePanel((prev) => (prev === panel ? null : panel));
  };

  return (
    <>
      <Panel
        className="flex flex-col gap-2 rounded-xl bg-card/80 backdrop-blur-sm border border-border p-2"
        onDoubleClick={(e) => e.stopPropagation()}
        position="top-left"
      >
        {/* Add Node button -- large, orange, circular */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              className="size-10 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 shadow-md"
              size="icon"
            >
              <PlusIcon size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent side="right" align="start" sideOffset={8}>
            {nodeButtons.map((btn) => (
              <DropdownMenuItem
                key={btn.id}
                onClick={() => handleAddNode(btn.id)}
              >
                <btn.icon size={14} />
                <span>{btn.label}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <div className="h-px w-full bg-border" />

        {/* Assets */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`size-9 rounded-lg transition-colors ${
                activePanel === "assets"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => togglePanel("assets")}
            >
              <ImageIcon size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Assets</TooltipContent>
        </Tooltip>

        {/* Templates */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className={`size-9 rounded-lg transition-colors ${
                activePanel === "templates"
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
              onClick={() => togglePanel("templates")}
            >
              <LayoutTemplateIcon size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Templates</TooltipContent>
        </Tooltip>

        {/* Learn — opens brand references in a new tab for now */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-muted-foreground hover:text-foreground transition-colors"
              onClick={() => {
                toast.info("Brand memory e referencias estao sendo aprendidas automaticamente via chat.");
              }}
            >
              <BookOpenIcon size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Brand Memory</TooltipContent>
        </Tooltip>

        {/* Chat/AI toggle */}
        <Tooltip>
          <TooltipTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="size-9 rounded-lg text-primary hover:text-primary/80 transition-colors"
              onClick={() => onToggleChat?.()}
            >
              <MessageCircleIcon size={18} />
            </Button>
          </TooltipTrigger>
          <TooltipContent side="right">Chat AI</TooltipContent>
        </Tooltip>
      </Panel>

      {/* Side panel for Assets / Templates */}
      {activePanel && (
        <Panel
          className="ml-16 w-64 max-h-[70vh] overflow-y-auto rounded-xl bg-card/95 backdrop-blur-sm border border-border p-3"
          onDoubleClick={(e) => e.stopPropagation()}
          position="top-left"
        >
          {activePanel === "assets" && (
            <div className="space-y-3">
              <h3 className="text-xs font-medium text-foreground">Assets Criados</h3>
              {loadingAssets && (
                <div className="flex justify-center py-4">
                  <Loader2Icon className="size-4 animate-spin text-muted-foreground" />
                </div>
              )}
              {!loadingAssets && assets.length === 0 && (
                <p className="text-[11px] text-muted-foreground py-2">
                  Nenhum asset ainda. Crie posts pelo chat!
                </p>
              )}
              <div className="grid grid-cols-2 gap-2">
                {assets.map((asset) => {
                  const imgUrl = asset.final_image_url || asset.base_image_url;
                  if (!imgUrl) return null;
                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleUseAsset(asset)}
                      className="group relative rounded-lg overflow-hidden border border-border hover:border-primary/50 transition-colors"
                    >
                      <Image
                        src={imgUrl}
                        alt={asset.caption || asset.platform}
                        width={200}
                        height={200}
                        className="w-full aspect-square object-cover"
                      />
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/70 to-transparent p-1.5">
                        <span className="text-[9px] text-white font-medium">
                          {asset.platform}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {activePanel === "templates" && (
            <div className="space-y-2">
              <h3 className="text-xs font-medium text-foreground">Templates</h3>
              {templatePresets.map((tpl) => (
                <button
                  key={tpl.label}
                  onClick={tpl.action}
                  className="flex w-full flex-col gap-0.5 rounded-lg border border-border px-3 py-2 text-left hover:bg-secondary/60 hover:border-primary/20 transition-all"
                >
                  <span className="text-xs font-medium text-foreground">{tpl.label}</span>
                  <span className="text-[10px] text-muted-foreground">{tpl.desc}</span>
                </button>
              ))}
            </div>
          )}
        </Panel>
      )}
    </>
  );
};

export const Toolbar = memo(ToolbarInner);
