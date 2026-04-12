"use client";

import { useCallback, useEffect, useState } from "react";
import {
  AlignCenterIcon,
  AlignLeftIcon,
  AlignRightIcon,
  BoldIcon,
  DownloadIcon,
  ItalicIcon,
  MinusIcon,
  PlusIcon,
  Trash2Icon,
  TypeIcon,
} from "lucide-react";
import { HexColorPicker } from "react-colorful";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { getPopularFonts, loadGoogleFont } from "@/lib/google-fonts";
import type { ActiveTextProps, PostEditorHandle } from "./post-editor";

interface PostEditorToolbarProps {
  editorRef: React.RefObject<PostEditorHandle | null>;
  activeTextProps: ActiveTextProps | null;
}

export function PostEditorToolbar({ editorRef, activeTextProps }: PostEditorToolbarProps) {
  const hasSelection = activeTextProps !== null;
  const [fontsLoaded, setFontsLoaded] = useState(false);
  const fonts = getPopularFonts();

  // Preload all fonts for the dropdown preview
  useEffect(() => {
    async function preload() {
      await Promise.all(fonts.map((f) => loadGoogleFont(f)));
      setFontsLoaded(true);
    }
    preload();
  }, [fonts]);

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

  const fontSize = activeTextProps?.fontSize ?? 48;

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
        <PopoverContent className="w-52 max-h-64 overflow-y-auto p-1" align="start">
          {fonts.map((font) => (
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

      {/* Delete */}
      <ToolbarButton disabled={!hasSelection} onClick={handleDelete} title="Delete selected">
        <Trash2Icon className="size-4" />
      </ToolbarButton>

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
