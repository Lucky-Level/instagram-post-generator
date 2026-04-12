"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { loadGoogleFont } from "@/lib/google-fonts";

export interface ActiveTextProps {
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
}

export interface PostEditorHandle {
  addText: () => void;
  updateActiveText: (props: Partial<ActiveTextProps>) => void;
  deleteSelected: () => void;
  exportImage: () => string | null;
  initWithTextLayers: (layers: { headline?: string; subtitle?: string; cta?: string }) => void;
}

interface PostEditorProps {
  imageUrl: string;
  displayWidth?: number;
  onSelectionChange?: (props: ActiveTextProps | null) => void;
}

const CANVAS_SIZE = 1080;

const DEFAULT_TEXT_PROPS: ActiveTextProps = {
  fontFamily: "Inter",
  fontSize: 48,
  fill: "#ffffff",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "center",
};

export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ imageUrl, displayWidth = 540, onSelectionChange }, ref) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvasRef = useRef<any>(null);
    const [ready, setReady] = useState(false);

    const scale = displayWidth / CANVAS_SIZE;

    const getActiveTextProps = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any): ActiveTextProps => ({
        fontFamily: obj.fontFamily || "Inter",
        fontSize: Math.round(obj.fontSize || 48),
        fill: (obj.fill as string) || "#ffffff",
        fontWeight: obj.fontWeight || "normal",
        fontStyle: obj.fontStyle || "normal",
        textAlign: obj.textAlign || "center",
      }),
      [],
    );

    // Initialize canvas
    useEffect(() => {
      let cancelled = false;
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let canvas: any = null;

      async function init() {
        const fabric = await import("fabric");
        if (cancelled || !canvasElRef.current) return;

        canvas = new fabric.Canvas(canvasElRef.current, {
          width: CANVAS_SIZE,
          height: CANVAS_SIZE,
          selection: true,
        });
        fabricCanvasRef.current = canvas;

        // Load background image
        const img = await fabric.FabricImage.fromURL(imageUrl, {
          crossOrigin: "anonymous",
        });
        // Scale image to cover the canvas
        const scaleX = CANVAS_SIZE / (img.width || 1);
        const scaleY = CANVAS_SIZE / (img.height || 1);
        const imgScale = Math.max(scaleX, scaleY);
        img.scaleX = imgScale;
        img.scaleY = imgScale;
        img.originX = "center";
        img.originY = "center";
        img.left = CANVAS_SIZE / 2;
        img.top = CANVAS_SIZE / 2;

        canvas.backgroundImage = img;
        canvas.renderAll();

        // Selection events
        canvas.on("selection:created", () => {
          const active = canvas.getActiveObject();
          if (active && active.type === "textbox") {
            onSelectionChange?.(getActiveTextProps(active));
          }
        });

        canvas.on("selection:updated", () => {
          const active = canvas.getActiveObject();
          if (active && active.type === "textbox") {
            onSelectionChange?.(getActiveTextProps(active));
          }
        });

        canvas.on("selection:cleared", () => {
          onSelectionChange?.(null);
        });

        canvas.on("object:modified", () => {
          const active = canvas.getActiveObject();
          if (active && active.type === "textbox") {
            onSelectionChange?.(getActiveTextProps(active));
          }
        });

        setReady(true);
      }

      init();

      return () => {
        cancelled = true;
        if (canvas) {
          canvas.dispose();
          fabricCanvasRef.current = null;
        }
      };
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [imageUrl]);

    useImperativeHandle(
      ref,
      () => ({
        addText: async () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;

          await loadGoogleFont("Inter");

          const fabric = await import("fabric");
          const text = new fabric.Textbox("Your text here", {
            left: CANVAS_SIZE / 2,
            top: CANVAS_SIZE / 2,
            originX: "center",
            originY: "center",
            width: 600,
            fontSize: DEFAULT_TEXT_PROPS.fontSize,
            fontFamily: DEFAULT_TEXT_PROPS.fontFamily,
            fill: DEFAULT_TEXT_PROPS.fill,
            textAlign: DEFAULT_TEXT_PROPS.textAlign as "center" | "left" | "right",
            fontWeight: DEFAULT_TEXT_PROPS.fontWeight,
            fontStyle: DEFAULT_TEXT_PROPS.fontStyle as "normal" | "italic",
            editable: true,
            shadow: new fabric.Shadow({
              color: "rgba(0,0,0,0.6)",
              blur: 8,
              offsetX: 2,
              offsetY: 2,
            }),
          });
          canvas.add(text);
          canvas.setActiveObject(text);
          canvas.renderAll();
          onSelectionChange?.(DEFAULT_TEXT_PROPS);
        },

        updateActiveText: async (props: Partial<ActiveTextProps>) => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;
          const active = canvas.getActiveObject();
          if (!active || active.type !== "textbox") return;

          if (props.fontFamily) {
            await loadGoogleFont(props.fontFamily);
          }

          active.set(props);
          canvas.renderAll();
          onSelectionChange?.(getActiveTextProps(active));
        },

        deleteSelected: () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;
          const active = canvas.getActiveObject();
          if (active) {
            canvas.remove(active);
            canvas.discardActiveObject();
            canvas.renderAll();
            onSelectionChange?.(null);
          }
        },

        exportImage: () => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return null;
          return canvas.toDataURL({
            format: "png",
            quality: 1,
            multiplier: 1,
          });
        },

        initWithTextLayers: async ({ headline, subtitle, cta }) => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;

          const fabric = await import("fabric");
          await loadGoogleFont("Inter");

          // Remove textboxes existentes para evitar duplicatas
          const existingTexts = canvas.getObjects("textbox");
          for (const obj of existingTexts) {
            canvas.remove(obj);
          }

          const layers = [
            { text: headline, y: 180, fontSize: 72, bold: true },
            { text: subtitle, y: 680, fontSize: 42, bold: false },
            { text: cta,      y: 880, fontSize: 32, bold: false },
          ].filter((l): l is { text: string; y: number; fontSize: number; bold: boolean } =>
            typeof l.text === "string" && l.text.trim().length > 0
          );

          for (const layer of layers) {
            const textbox = new fabric.Textbox(layer.text, {
              left: CANVAS_SIZE / 2,
              top: layer.y,
              originX: "center",
              originY: "center",
              width: 900,
              fontSize: layer.fontSize,
              fontFamily: "Inter",
              fill: "#ffffff",
              textAlign: "center",
              fontWeight: layer.bold ? "bold" : "normal",
              fontStyle: "normal",
              editable: true,
              shadow: new fabric.Shadow({
                color: "rgba(0,0,0,0.7)",
                blur: 10,
                offsetX: 2,
                offsetY: 2,
              }),
            });
            canvas.add(textbox);
          }

          canvas.renderAll();
        },
      }),
      [getActiveTextProps, onSelectionChange],
    );

    return (
      <div
        className="relative overflow-hidden rounded-lg border border-border bg-secondary/30"
        style={{
          width: displayWidth,
          height: displayWidth,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transformOrigin: "top left",
            width: CANVAS_SIZE,
            height: CANVAS_SIZE,
          }}
        >
          <canvas ref={canvasElRef} />
        </div>
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center bg-background/80">
            <div className="size-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          </div>
        )}
      </div>
    );
  },
);

PostEditor.displayName = "PostEditor";
