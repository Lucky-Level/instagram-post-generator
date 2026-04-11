"use client";

import { useReactFlow, useStore } from "@xyflow/react";
import { useAtom } from "jotai";
import {
  HandIcon,
  MinusIcon,
  MousePointer2Icon,
  PlusIcon,
} from "lucide-react";
import { memo, useCallback } from "react";
import { canvasToolAtom, type CanvasTool } from "@/lib/canvas-tool";
import { Panel } from "./ai-elements/panel";
import { Button } from "./ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

export const ControlsInner = () => {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  const [activeTool, setActiveTool] = useAtom(canvasToolAtom);

  // Get current zoom from ReactFlow store
  const zoom = useStore((s) => Math.round(s.transform[2] * 100));

  const handleToolChange = useCallback((tool: CanvasTool) => {
    setActiveTool(tool);
  }, [setActiveTool]);

  return (
    <Panel
      className="flex items-center gap-1 rounded-xl bg-card/80 backdrop-blur-sm border border-border p-1"
      onDoubleClick={(e) => e.stopPropagation()}
      position="bottom-right"
    >
      {/* Select tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`size-8 rounded-lg ${
              activeTool === "select"
                ? "bg-secondary text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleToolChange("select")}
          >
            <MousePointer2Icon size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Select</TooltipContent>
      </Tooltip>

      {/* Pan tool */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className={`size-8 rounded-lg ${
              activeTool === "pan"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:text-foreground"
            }`}
            onClick={() => handleToolChange("pan")}
          >
            <HandIcon size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Pan</TooltipContent>
      </Tooltip>

      {/* Separator */}
      <div className="mx-1 h-5 w-px bg-border" />

      {/* Zoom out */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => zoomOut({ duration: 200 })}
          >
            <MinusIcon size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom out</TooltipContent>
      </Tooltip>

      {/* Zoom percentage */}
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            className="min-w-[40px] px-1 text-center text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            onClick={() => fitView({ duration: 300, padding: 0.2 })}
            type="button"
          >
            {zoom}%
          </button>
        </TooltipTrigger>
        <TooltipContent>Fit view</TooltipContent>
      </Tooltip>

      {/* Zoom in */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-8 rounded-lg text-muted-foreground hover:text-foreground"
            onClick={() => zoomIn({ duration: 200 })}
          >
            <PlusIcon size={15} />
          </Button>
        </TooltipTrigger>
        <TooltipContent>Zoom in</TooltipContent>
      </Tooltip>
    </Panel>
  );
};

export const Controls = memo(ControlsInner);
