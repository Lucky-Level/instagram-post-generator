"use client";

import { Handle, Position, type NodeProps, type Node } from "@xyflow/react";
import { useAtomValue, useSetAtom } from "jotai";
import {
  AlertCircleIcon,
  CheckCircle2Icon,
  Loader2Icon,
} from "lucide-react";
import { useCallback, useMemo } from "react";

import { cn } from "@/lib/utils";
import {
  pipelineStateAtom,
  setActiveNodeAtom,
  type NodeStatus,
} from "@/lib/pipeline-state";

// --- Data interface ---

export interface PipelineNodeComponentData {
  pipelineNodeId: string;
  etapa: string;
  nodeType: string;
  label: string;
  icon: string;
  color: string;
  [key: string]: unknown;
}

type PipelineNodeType = Node<PipelineNodeComponentData, "pipeline">;

// --- Status styling ---

const statusBorder: Record<NodeStatus, string> = {
  pending: "border-border",
  running: "border-amber-500 shadow-[0_0_12px_rgba(245,158,11,0.15)]",
  done: "border-emerald-500",
  error: "border-red-500",
  skipped: "border-border opacity-50",
};

const StatusDot = ({ status }: { status: NodeStatus }) => {
  if (status === "running") {
    return <Loader2Icon className="size-3.5 animate-spin text-amber-500" />;
  }
  if (status === "error") {
    return <AlertCircleIcon className="size-3.5 text-red-500" />;
  }
  if (status === "done") {
    return <CheckCircle2Icon className="size-3.5 text-emerald-500" />;
  }
  // pending / skipped
  return (
    <div
      className={cn(
        "size-2 rounded-full",
        status === "skipped" ? "bg-muted-foreground/40" : "bg-muted-foreground/60"
      )}
    />
  );
};

// --- Component ---

export function PipelineNode({ data, selected }: NodeProps<PipelineNodeType>) {
  const pipelineState = useAtomValue(pipelineStateAtom);
  const setActiveNode = useSetAtom(setActiveNodeAtom);

  const pipelineNode = pipelineState?.nodes[data.pipelineNodeId] ?? null;
  const status: NodeStatus = pipelineNode?.status ?? "pending";
  const nodeData = pipelineNode?.data ?? {};

  // Find first non-empty string value for preview
  const preview = useMemo(() => {
    for (const val of Object.values(nodeData)) {
      if (typeof val === "string" && val.trim().length > 0) {
        return val.length > 60 ? `${val.slice(0, 57)}...` : val;
      }
    }
    return null;
  }, [nodeData]);

  // Collect short string values as tags
  const tags = useMemo(() => {
    const result: string[] = [];
    for (const val of Object.values(nodeData)) {
      if (typeof val === "string" && val.trim().length > 0 && val.length <= 24) {
        result.push(val);
      }
    }
    return result.slice(0, 4);
  }, [nodeData]);

  const isFinalNode = data.nodeType.endsWith("-final");
  const isDone = status === "done";

  const handleDoubleClick = useCallback(() => {
    setActiveNode(data.pipelineNodeId);
  }, [setActiveNode, data.pipelineNodeId]);

  return (
    <div
      className={cn(
        "w-[200px] cursor-pointer rounded-xl border bg-card transition-all",
        statusBorder[status],
        selected && "ring-2 ring-primary/50"
      )}
      onDoubleClick={handleDoubleClick}
    >
      {/* Handles */}
      <Handle position={Position.Left} type="target" />
      <Handle position={Position.Right} type="source" />

      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <div
          className="flex size-6 shrink-0 items-center justify-center rounded"
          style={{ backgroundColor: `${data.color}20` }}
        >
          <div
            className="size-3 rounded-sm"
            style={{ backgroundColor: data.color }}
          />
        </div>
        <span className="flex-1 truncate text-xs font-medium text-foreground">
          {data.label}
        </span>
        <StatusDot status={status} />
      </div>

      {/* Body - preview */}
      {preview && (
        <div className="border-t border-border px-3 py-2">
          <p className="text-[11px] leading-tight text-muted-foreground">
            {preview}
          </p>
        </div>
      )}

      {/* Tags */}
      {tags.length > 0 && !preview && (
        <div className="flex flex-wrap gap-1 border-t border-border px-3 py-2">
          {tags.map((tag, i) => (
            <span
              key={i}
              className="rounded-md bg-secondary px-1.5 py-0.5 text-[10px] text-muted-foreground"
            >
              {tag}
            </span>
          ))}
        </div>
      )}

      {/* Footer - Aprovado badge for final nodes */}
      {isFinalNode && isDone && (
        <div className="flex items-center gap-1.5 border-t border-border px-3 py-2">
          <CheckCircle2Icon className="size-3 text-emerald-500" />
          <span className="text-[10px] font-medium text-emerald-500">
            Aprovado
          </span>
        </div>
      )}
    </div>
  );
}
