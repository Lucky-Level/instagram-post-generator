"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { PostEditor, type ActiveTextProps, type PostEditorHandle } from "./post-editor";
import { PostEditorToolbar } from "./post-editor-toolbar";

interface PostEditorModalProps {
  imageUrl: string;
  open: boolean;
  onClose: () => void;
  onSave: (dataUrl: string) => void;
}

export function PostEditorModal({ imageUrl, open, onClose, onSave }: PostEditorModalProps) {
  const editorRef = useRef<PostEditorHandle>(null);
  const [activeTextProps, setActiveTextProps] = useState<ActiveTextProps | null>(null);
  const [displayWidth, setDisplayWidth] = useState(540);

  // Calculate display width based on viewport
  useEffect(() => {
    if (!open) return;

    function calcWidth() {
      const maxW = Math.min(600, window.innerWidth - 48);
      setDisplayWidth(maxW);
    }
    calcWidth();
    window.addEventListener("resize", calcWidth);
    return () => window.removeEventListener("resize", calcWidth);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const handleSave = useCallback(() => {
    const dataUrl = editorRef.current?.exportImage();
    if (dataUrl) {
      onSave(dataUrl);
    }
    onClose();
  }, [onSave, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Content */}
      <div
        className={cn(
          "relative z-10 flex max-h-[95vh] flex-col items-center gap-3 overflow-y-auto p-4",
        )}
      >
        {/* Header */}
        <div className="flex w-full items-center justify-between" style={{ maxWidth: displayWidth }}>
          <h3 className="text-sm font-medium text-foreground">Edit Post</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              className="rounded-md bg-primary px-4 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              Save
            </button>
            <button
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
            >
              <XIcon className="size-4" />
            </button>
          </div>
        </div>

        {/* Canvas */}
        <PostEditor
          ref={editorRef}
          imageUrl={imageUrl}
          displayWidth={displayWidth}
          onSelectionChange={setActiveTextProps}
        />

        {/* Toolbar */}
        <div style={{ maxWidth: displayWidth, width: "100%" }}>
          <PostEditorToolbar
            editorRef={editorRef}
            activeTextProps={activeTextProps}
          />
        </div>
      </div>
    </div>
  );
}
