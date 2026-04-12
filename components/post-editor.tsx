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
  // existing
  fontFamily: string;
  fontSize: number;
  fill: string;
  fontWeight: string;
  fontStyle: string;
  textAlign: string;
  // new
  strokeWidth: number;
  stroke: string;
  shadowColor: string;
  shadowBlur: number;
  shadowOffsetX: number;
  shadowOffsetY: number;
  charSpacing: number;
  lineHeight: number;
  opacity: number;
}

export interface PostEditorHandle {
  addText: () => void;
  updateActiveText: (props: Partial<ActiveTextProps>) => void;
  deleteSelected: () => void;
  exportImage: () => string | null;
  initWithTextLayers: (layers: {
    headline?: string;
    subtitle?: string;
    cta?: string;
    logoUrl?: string;
    logoPosition?: { x: number; y: number; width: number };
    textStyles?: {
      headline?: Partial<ActiveTextProps>;
      subtitle?: Partial<ActiveTextProps>;
      cta?: Partial<ActiveTextProps>;
    };
  }) => void;
}

interface PostEditorProps {
  imageUrl: string;
  displayWidth?: number;
  onSelectionChange?: (props: ActiveTextProps | null) => void;
  onReady?: () => void;
}

const CANVAS_SIZE = 1080;

const DEFAULT_TEXT_PROPS: ActiveTextProps = {
  fontFamily: "Inter",
  fontSize: 48,
  fill: "#ffffff",
  fontWeight: "normal",
  fontStyle: "normal",
  textAlign: "center",
  strokeWidth: 0,
  stroke: "#000000",
  shadowColor: "rgba(0,0,0,0.6)",
  shadowBlur: 8,
  shadowOffsetX: 2,
  shadowOffsetY: 2,
  charSpacing: 0,
  lineHeight: 1.16,
  opacity: 1,
};

export const PostEditor = forwardRef<PostEditorHandle, PostEditorProps>(
  ({ imageUrl, displayWidth = 540, onSelectionChange, onReady }, ref) => {
    const canvasElRef = useRef<HTMLCanvasElement>(null);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const fabricCanvasRef = useRef<any>(null);
    const [ready, setReady] = useState(false);

    const scale = displayWidth / CANVAS_SIZE;

    const getActiveTextProps = useCallback(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (obj: any): ActiveTextProps => {
        const shadow = obj.shadow as any;
        return {
          fontFamily: obj.fontFamily || "Inter",
          fontSize: Math.round(obj.fontSize || 48),
          fill: (obj.fill as string) || "#ffffff",
          fontWeight: obj.fontWeight || "normal",
          fontStyle: obj.fontStyle || "normal",
          textAlign: obj.textAlign || "center",
          strokeWidth: obj.strokeWidth ?? 0,
          stroke: typeof obj.stroke === "string" ? obj.stroke : "#000000",
          shadowColor: shadow?.color || "rgba(0,0,0,0)",
          shadowBlur: shadow?.blur ?? 0,
          shadowOffsetX: shadow?.offsetX ?? 0,
          shadowOffsetY: shadow?.offsetY ?? 0,
          charSpacing: obj.charSpacing ?? 0,
          lineHeight: obj.lineHeight ?? 1.16,
          opacity: obj.opacity ?? 1,
        };
      },
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
        onReady?.();
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
            strokeWidth: DEFAULT_TEXT_PROPS.strokeWidth,
            stroke: DEFAULT_TEXT_PROPS.stroke,
            charSpacing: DEFAULT_TEXT_PROPS.charSpacing,
            lineHeight: DEFAULT_TEXT_PROPS.lineHeight,
            opacity: DEFAULT_TEXT_PROPS.opacity,
            editable: true,
            shadow: new fabric.Shadow({
              color: DEFAULT_TEXT_PROPS.shadowColor,
              blur: DEFAULT_TEXT_PROPS.shadowBlur,
              offsetX: DEFAULT_TEXT_PROPS.shadowOffsetX,
              offsetY: DEFAULT_TEXT_PROPS.shadowOffsetY,
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

          // Import fabric once at the top — needed for Shadow and font loading
          const fabric = await import("fabric");

          if (props.fontFamily) {
            await loadGoogleFont(props.fontFamily);
          }

          // Apply direct Fabric props
          const directProps = [
            "fontFamily", "fontSize", "fill", "fontWeight", "fontStyle",
            "textAlign", "strokeWidth", "stroke", "charSpacing", "lineHeight", "opacity",
          ] as const;
          for (const key of directProps) {
            if (props[key] !== undefined) {
              active.set(key as any, props[key]);
            }
          }

          // Shadow needs a fabric.Shadow object
          if (
            props.shadowColor !== undefined ||
            props.shadowBlur !== undefined ||
            props.shadowOffsetX !== undefined ||
            props.shadowOffsetY !== undefined
          ) {
            const current = active.shadow as any;
            active.set(
              "shadow",
              new fabric.Shadow({
                color: props.shadowColor ?? current?.color ?? "rgba(0,0,0,0)",
                blur: props.shadowBlur ?? current?.blur ?? 0,
                offsetX: props.shadowOffsetX ?? current?.offsetX ?? 0,
                offsetY: props.shadowOffsetY ?? current?.offsetY ?? 0,
              }),
            );
          }

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

        initWithTextLayers: async ({ headline, subtitle, cta, logoUrl, logoPosition, textStyles }) => {
          const canvas = fabricCanvasRef.current;
          if (!canvas) return;

          const fabric = await import("fabric");

          // Remove textboxes existentes para evitar duplicatas
          const existingTexts = canvas.getObjects("textbox");
          for (const obj of existingTexts) {
            canvas.remove(obj);
          }

          // Remove logos existentes
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const existingLogos = canvas.getObjects().filter((o: any) => (o as any)._isLogo);
          for (const obj of existingLogos) {
            canvas.remove(obj);
          }

          const layerDefs = [
            { key: "headline" as const, text: headline, y: 180, fontSize: 72, bold: true },
            { key: "subtitle" as const, text: subtitle, y: 680, fontSize: 42, bold: false },
            { key: "cta" as const, text: cta, y: 880, fontSize: 32, bold: false },
          ].filter(
            (l): l is typeof l & { text: string } =>
              typeof l.text === "string" && l.text.trim().length > 0,
          );

          for (const layer of layerDefs) {
            const styleOverride = textStyles?.[layer.key] ?? {};
            const fontFamily = styleOverride.fontFamily ?? "Inter";
            await loadGoogleFont(fontFamily);

            const textbox = new fabric.Textbox(layer.text, {
              left: CANVAS_SIZE / 2,
              top: layer.y,
              originX: "center",
              originY: "center",
              width: 900,
              fontSize: styleOverride.fontSize ?? layer.fontSize,
              fontFamily,
              fill: styleOverride.fill ?? "#ffffff",
              textAlign: (styleOverride.textAlign ?? "center") as "center" | "left" | "right",
              fontWeight: styleOverride.fontWeight ?? (layer.bold ? "bold" : "normal"),
              fontStyle: (styleOverride.fontStyle ?? "normal") as "normal" | "italic",
              strokeWidth: styleOverride.strokeWidth ?? 0,
              stroke: styleOverride.stroke ?? "",
              charSpacing: styleOverride.charSpacing ?? 0,
              lineHeight: styleOverride.lineHeight ?? 1.16,
              opacity: styleOverride.opacity ?? 1,
              editable: true,
              shadow: new fabric.Shadow({
                color: styleOverride.shadowColor ?? "rgba(0,0,0,0.7)",
                blur: styleOverride.shadowBlur ?? 10,
                offsetX: styleOverride.shadowOffsetX ?? 2,
                offsetY: styleOverride.shadowOffsetY ?? 2,
              }),
            });
            canvas.add(textbox);
          }

          // Inserir logo se fornecida
          if (logoUrl && logoPosition) {
            const logoImg = await fabric.FabricImage.fromURL(logoUrl, { crossOrigin: "anonymous" });
            const scaleX = logoPosition.width / (logoImg.width || 1);
            logoImg.set({
              left: logoPosition.x,
              top: logoPosition.y,
              scaleX,
              scaleY: scaleX,
              selectable: true,
              hasControls: true,
              lockRotation: true,
            });
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (logoImg as any)._isLogo = true;
            canvas.add(logoImg);
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
