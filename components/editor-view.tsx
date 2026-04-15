"use client";

import { useAtom } from "jotai";
import { useCallback, useRef, useState } from "react";
import { DownloadIcon, ArrowLeftIcon } from "lucide-react";
import { editorHandleAtom, editorOpenAtom, editorSessionAtom } from "@/lib/editor-state";
import { EditorSidebar } from "./editor-sidebar";
import { PostEditor, type ActiveTextProps, type PostEditorHandle } from "./post-editor";
import { PostEditorToolbar } from "./post-editor-toolbar";

interface EditorViewProps {
  agentId?: string;
}

export function EditorView({ agentId }: EditorViewProps) {
  const [, setEditorOpen] = useAtom(editorOpenAtom);
  const [session] = useAtom(editorSessionAtom);
  const editorRef = useRef<PostEditorHandle>(null);
  const [activeTextProps, setActiveTextProps] = useState<ActiveTextProps | null>(null);
  const [, setEditorHandle] = useAtom(editorHandleAtom);

  const handleClose = useCallback(() => {
    setEditorOpen(false);
  }, [setEditorOpen]);

  const handleReady = useCallback(() => {
    if (editorRef.current) setEditorHandle(editorRef.current);
    if (session.headline || session.subtitle || session.cta) {
      editorRef.current?.initWithTextLayers({
        headline: session.headline,
        subtitle: session.subtitle,
        cta: session.cta,
        logoUrl: session.logoUrl,
        logoPosition: session.logoPosition,
        textStyles: session.textStyles as any,
      });
    }
  }, [session, setEditorHandle]);

  const handleDownload = useCallback(() => {
    const dataUrl = editorRef.current?.exportImage();
    if (!dataUrl) return;
    const link = document.createElement("a");
    link.download = `post-${session.format}.png`;
    link.href = dataUrl;
    link.click();
  }, [session.format]);

  if (!session.imageUrl) return null;

  return (
    <div className="flex h-full w-full">
      {/* Left: Element sidebar */}
      <EditorSidebar />

      {/* Center: Canvas area */}
      <div className="flex flex-1 flex-col items-center overflow-hidden">
        {/* Editor header bar */}
        <div className="flex h-10 w-full shrink-0 items-center justify-between border-b border-border bg-background px-3">
          <button
            onClick={handleClose}
            className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeftIcon className="size-3.5" />
            Voltar ao Studio
          </button>
          <span className="text-xs text-muted-foreground">
            {session.canvasWidth} x {session.canvasHeight}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={handleDownload}
              className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <DownloadIcon className="size-3.5" />
              Download
            </button>
          </div>
        </div>

        {/* Canvas */}
        <div className="flex flex-1 items-center justify-center bg-secondary/20 p-6">
          <PostEditor
            ref={editorRef}
            imageUrl={session.imageUrl}
            displayWidth={Math.min(600, session.canvasWidth)}
            onSelectionChange={setActiveTextProps}
            onReady={handleReady}
          />
        </div>

        {/* Bottom toolbar */}
        <div className="w-full shrink-0 border-t border-border bg-background p-2">
          <PostEditorToolbar
            editorRef={editorRef}
            activeTextProps={activeTextProps}
            agentId={agentId}
          />
        </div>
      </div>
    </div>
  );
}
