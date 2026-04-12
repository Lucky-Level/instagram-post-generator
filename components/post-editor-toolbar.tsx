"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  DownloadIcon,
  ItalicIcon,
  MinusIcon,
  PlusIcon,
  SparklesIcon,
  Trash2Icon,
  TypeIcon,
  UploadIcon,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getFontCategories, getFontsByCategory, loadGoogleFont } from "@/lib/google-fonts";
import { TEXT_STYLE_PRESETS } from "@/lib/text-style-presets";
import type { ActiveTextProps, PostEditorHandle } from "./post-editor";

interface PostEditorToolbarProps {
  editorRef: React.RefObject<PostEditorHandle | null>;
  activeTextProps: ActiveTextProps | null;
  agentId?: string;
}

function rgbaToHex(color: string): string {
  if (color.startsWith("#")) return color;
  const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!match) return "#000000";
  const r = parseInt(match[1]).toString(16).padStart(2, "0");
  const g = parseInt(match[2]).toString(16).padStart(2, "0");
  const b = parseInt(match[3]).toString(16).padStart(2, "0");
  return `#${r}${g}${b}`;
}

export function PostEditorToolbar({ editorRef, activeTextProps, agentId }: PostEditorToolbarProps) {
  const hasSelection = activeTextProps !== null;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const [customFonts, setCustomFonts] = useState<string[]>([]);
  const fontUploadRef = useRef<HTMLInputElement>(null);

  // Preload all fonts for the dropdown preview
  useEffect(() => {
    async function preload() {
      const allFonts = getFontCategories().flatMap((cat) => getFontsByCategory(cat));
      await Promise.all(allFonts.map((f) => loadGoogleFont(f)));
      setFontsLoaded(true);
    }
    preload();
  }, []);

  const handleAddText = useCallback(() => {
    editorRef.current?.addText();
  }, [editorRef]);

  const handleDelete = useCallback(() => {
    editorRef.current?.deleteSelected();
  }, [editorRef]);

  const handleDownload = useCallback(() => {
    const dataUrl = editorRef.current?.exportImage();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = "post-edited.png";
    link.href = dataUrl;
    link.click();
  }, [editorRef]);

  const update = useCallback(
    (props: Partial<ActiveTextProps>) => {
      editorRef.current?.updateActiveText(props);
    },
    [editorRef],
  );

  const handleFontUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const formData = new FormData();
      formData.append("file", file);
      if (agentId) formData.append("agentId", agentId);

      const res = await fetch("/api/upload-font", { method: "POST", body: formData });
      if (!res.ok) return;

      const { url, fontFamily } = await res.json();

      // Register in browser via FontFace API
      const font = new FontFace(fontFamily, `url(${url})`);
      await font.load();
      document.fonts.add(font);

      setCustomFonts((prev) => [...prev, fontFamily]);
      e.target.value = "";
    },
    [agentId],
  );

  const fontSize = activeTextProps?.fontSize ?? 48;

  const hasStroke = (activeTextProps?.strokeWidth ?? 0) > 0;
  const hasShadow =
    (activeTextProps?.shadowBlur ?? 0) > 0 ||
    Math.abs(activeTextProps?.shadowOffsetX ?? 0) > 0 ||
    Math.abs(activeTextProps?.shadowOffsetY ?? 0) > 0;

  return (
    <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-border bg-card p-2">
      {/* Add Text */}
      <ToolbarButton onClick={handleAddText} title="Add Text">
        <TypeIcon className="size-4" />
      </ToolbarButton>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Font Family */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            disabled={!hasSelection}
            className={cn(
              "h-8 rounded-md border border-border bg-secondary/50 px-2 text-xs font-medium transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none max-w-[120px] truncate",
            )}
            title="Font family"
          >
            {activeTextProps?.fontFamily ?? "Font"}
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 max-h-72 overflow-y-auto p-1" align="start">
          {customFonts.length > 0 && (
            <div>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Minhas Fontes
              </p>
              {customFonts.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => update({ fontFamily: font })}
                  className={cn(
                    "w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary transition-colors",
                    activeTextProps?.fontFamily === font && "bg-secondary font-semibold",
                  )}
                  style={{ fontFamily: `"${font}", sans-serif` }}
                >
                  {font}
                </button>
              ))}
              <div className="my-1 border-t border-border" />
            </div>
          )}
          {getFontCategories().map((cat) => (
            <div key={cat}>
              <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                {cat}
              </p>
              {getFontsByCategory(cat).map((font) => (
                <button
                  key={font}
                  onClick={() => update({ fontFamily: font })}
                  className={cn(
                    "w-full rounded-md px-3 py-1.5 text-left text-sm hover:bg-secondary transition-colors",
                    activeTextProps?.fontFamily === font && "bg-secondary font-semibold",
                  )}
                  style={fontsLoaded ? { fontFamily: `"${font}", sans-serif` } : undefined}
                >
                  {font}
                </button>
              ))}
            </div>
          ))}
        </PopoverContent>
      </Popover>

      {/* Font Size */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          disabled={!hasSelection}
          onClick={() => update({ fontSize: Math.max(12, fontSize - 2) })}
          title="Decrease size"
        >
          <MinusIcon className="size-3.5" />
        </ToolbarButton>
        <input
          type="number"
          min={12}
          max={120}
          disabled={!hasSelection}
          value={hasSelection ? fontSize : ""}
          onChange={(e) => {
            const v = Number.parseInt(e.target.value, 10);
            if (v >= 12 && v <= 120) update({ fontSize: v });
          }}
          className="h-8 w-12 rounded-md border border-border bg-secondary/50 text-center text-xs font-medium outline-none focus:ring-1 focus:ring-primary/50 disabled:opacity-40"
        />
        <ToolbarButton
          disabled={!hasSelection}
          onClick={() => update({ fontSize: Math.min(120, fontSize + 2) })}
          title="Increase size"
        >
          <PlusIcon className="size-3.5" />
        </ToolbarButton>
      </div>

      {/* Color Picker */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            disabled={!hasSelection}
            className="flex size-8 items-center justify-center rounded-md border border-border bg-secondary/50 transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none"
            title="Text color"
          >
            <div
              className="size-4 rounded-sm border border-border"
              style={{ backgroundColor: activeTextProps?.fill ?? "#ffffff" }}
            />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-3" align="start">
          <HexColorPicker
            color={activeTextProps?.fill ?? "#ffffff"}
            onChange={(color) => update({ fill: color })}
          />
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Bold */}
      <ToolbarButton
        disabled={!hasSelection}
        active={activeTextProps?.fontWeight === "bold"}
        onClick={() =>
          update({
            fontWeight: activeTextProps?.fontWeight === "bold" ? "normal" : "bold",
          })
        }
        title="Bold"
      >
        <BoldIcon className="size-4" />
      </ToolbarButton>

      {/* Italic */}
      <ToolbarButton
        disabled={!hasSelection}
        active={activeTextProps?.fontStyle === "italic"}
        onClick={() =>
          update({
            fontStyle: activeTextProps?.fontStyle === "italic" ? "normal" : "italic",
          })
        }
        title="Italic"
      >
        <ItalicIcon className="size-4" />
      </ToolbarButton>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Text Align */}
      <ToolbarButton
        disabled={!hasSelection}
        active={activeTextProps?.textAlign === "left"}
        onClick={() => update({ textAlign: "left" })}
        title="Align left"
      >
        <AlignLeftIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection}
        active={activeTextProps?.textAlign === "center"}
        onClick={() => update({ textAlign: "center" })}
        title="Align center"
      >
        <AlignCenterIcon className="size-4" />
      </ToolbarButton>
      <ToolbarButton
        disabled={!hasSelection}
        active={activeTextProps?.textAlign === "right"}
        onClick={() => update({ textAlign: "right" })}
        title="Align right"
      >
        <AlignRightIcon className="size-4" />
      </ToolbarButton>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Outline toggle */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!hasSelection}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none",
              hasStroke ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"
            )}
            title="Contorno (outline)"
          >
            O
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3 space-y-3" align="start">
          <p className="text-xs font-medium">Contorno</p>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground w-16">Espessura</span>
            <input
              type="range" min={0} max={20} step={1}
              value={activeTextProps?.strokeWidth ?? 0}
              onChange={(e) => update({ strokeWidth: Number(e.target.value) })}
              className="flex-1"
            />
            <span className="text-xs w-6 text-right">{activeTextProps?.strokeWidth ?? 0}</span>
          </div>
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Cor</span>
            <HexColorPicker
              color={activeTextProps?.stroke ?? "#000000"}
              onChange={(color) => update({ stroke: color })}
              style={{ width: "100%" }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Shadow toggle */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!hasSelection}
            className={cn(
              "flex size-8 items-center justify-center rounded-md border text-xs font-bold transition-colors hover:bg-secondary disabled:opacity-40 disabled:pointer-events-none",
              hasShadow ? "border-primary bg-primary/10 text-primary" : "border-transparent text-muted-foreground"
            )}
            title="Sombra"
          >
            S
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-52 p-3 space-y-3" align="start">
          <p className="text-xs font-medium">Sombra</p>
          {(
            [
              { label: "Blur", key: "shadowBlur" as const, min: 0, max: 30 },
              { label: "Offset X", key: "shadowOffsetX" as const, min: -20, max: 20 },
              { label: "Offset Y", key: "shadowOffsetY" as const, min: -20, max: 20 },
            ] as const
          ).map(({ label, key, min, max }) => (
            <div key={key} className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground w-16">{label}</span>
              <input
                type="range"
                min={min}
                max={max}
                step={1}
                value={activeTextProps?.[key] ?? 0}
                onChange={(e) => update({ [key]: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs w-6 text-right">{activeTextProps?.[key] ?? 0}</span>
            </div>
          ))}
          <div className="space-y-1">
            <span className="text-xs text-muted-foreground">Cor</span>
            <HexColorPicker
              color={rgbaToHex(activeTextProps?.shadowColor ?? "#000000")}
              onChange={(color) => update({ shadowColor: color })}
              style={{ width: "100%" }}
            />
          </div>
        </PopoverContent>
      </Popover>

      {/* Letter-spacing + Opacity */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!hasSelection}
            className="flex size-8 items-center justify-center rounded-md border border-transparent text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            title="Espaçamento e opacidade"
          >
            Aa
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-48 p-3 space-y-4" align="start">
          <div className="space-y-2">
            <p className="text-xs font-medium">Espaçamento</p>
            <div className="flex items-center gap-2">
              <input
                type="range" min={-200} max={800} step={10}
                value={activeTextProps?.charSpacing ?? 0}
                onChange={(e) => update({ charSpacing: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">{activeTextProps?.charSpacing ?? 0}</span>
            </div>
          </div>
          <div className="space-y-2">
            <p className="text-xs font-medium">Opacidade</p>
            <div className="flex items-center gap-2">
              <input
                type="range" min={0} max={1} step={0.05}
                value={activeTextProps?.opacity ?? 1}
                onChange={(e) => update({ opacity: Number(e.target.value) })}
                className="flex-1"
              />
              <span className="text-xs w-8 text-right">{Math.round((activeTextProps?.opacity ?? 1) * 100)}%</span>
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Style Presets */}
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!hasSelection}
            className="flex h-8 items-center gap-1 rounded-md border border-transparent px-2 text-xs text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none"
            title="Estilos prontos"
          >
            <SparklesIcon className="size-3.5" />
            Estilos
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-56 p-2" align="start">
          <p className="px-1 pb-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Estilos prontos
          </p>
          <div className="space-y-1">
            {TEXT_STYLE_PRESETS.map((preset) => (
              <button
                key={preset.name}
                type="button"
                onClick={async () => {
                  if (preset.style.fontFamily) {
                    await loadGoogleFont(preset.style.fontFamily);
                  }
                  update(preset.style);
                }}
                className="w-full rounded-lg border border-border px-3 py-2 text-left transition-colors hover:bg-secondary"
              >
                <span
                  className="block text-sm leading-tight"
                  style={fontsLoaded ? {
                    fontFamily: `"${preset.style.fontFamily}", sans-serif`,
                    fontWeight: preset.style.fontWeight || "normal",
                  } : undefined}
                >
                  {preset.name}
                </span>
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>

      <div className="mx-0.5 h-6 w-px bg-border" />

      {/* Delete */}
      <ToolbarButton disabled={!hasSelection} onClick={handleDelete} title="Delete selected">
        <Trash2Icon className="size-4" />
      </ToolbarButton>

      {/* Upload custom font */}
      <>
        <input
          ref={fontUploadRef}
          type="file"
          accept=".ttf,.woff,.woff2"
          className="hidden"
          onChange={handleFontUpload}
        />
        <button
          type="button"
          onClick={() => fontUploadRef.current?.click()}
          title="Upload fonte customizada"
          className="flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground"
        >
          <UploadIcon className="size-4" />
        </button>
      </>

      {/* Download */}
      <ToolbarButton onClick={handleDownload} title="Download PNG">
        <DownloadIcon className="size-4" />
      </ToolbarButton>
    </div>
  );
}

function ToolbarButton({
  children,
  disabled,
  active,
  onClick,
  title,
}: {
  children: React.ReactNode;
  disabled?: boolean;
  active?: boolean;
  onClick?: () => void;
  title?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      title={title}
      className={cn(
        "flex size-8 items-center justify-center rounded-md border border-transparent text-muted-foreground transition-colors hover:bg-secondary hover:text-foreground disabled:opacity-40 disabled:pointer-events-none",
        active && "bg-secondary text-foreground border-border",
      )}
    >
      {children}
    </button>
  );
}
