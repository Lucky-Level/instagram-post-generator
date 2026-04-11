"use client";

import { useReactFlow } from "@xyflow/react";
import {
  BookOpenIcon,
  ImageIcon,
  LayoutTemplateIcon,
  MessageCircleIcon,
  PlusIcon,
} from "lucide-react";
import { memo } from "react";
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

export const ToolbarInner = () => {
  const { getViewport } = useReactFlow();
  const { addNode } = useNodeOperations();

  const handleAddNode = (type: string) => {
    const viewport = getViewport();
    const centerX =
      -viewport.x / viewport.zoom + window.innerWidth / 2 / viewport.zoom;
    const centerY =
      -viewport.y / viewport.zoom + window.innerHeight / 2 / viewport.zoom;
    addNode(type, { position: { x: centerX, y: centerY } });
  };

  return (
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
            className="size-9 rounded-lg text-muted-foreground/50 cursor-default"
            disabled
          >
            <ImageIcon size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Assets (coming soon)</TooltipContent>
      </Tooltip>

      {/* Templates */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-muted-foreground/50 cursor-default"
            disabled
          >
            <LayoutTemplateIcon size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Templates (coming soon)</TooltipContent>
      </Tooltip>

      {/* Learn */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-muted-foreground/50 cursor-default"
            disabled
          >
            <BookOpenIcon size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Learn (coming soon)</TooltipContent>
      </Tooltip>

      {/* Chat/AI -- orange icon */}
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="size-9 rounded-lg text-primary/50 cursor-default"
            disabled
          >
            <MessageCircleIcon size={18} />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="right">Ask AI (coming soon)</TooltipContent>
      </Tooltip>
    </Panel>
  );
};

export const Toolbar = memo(ToolbarInner);
