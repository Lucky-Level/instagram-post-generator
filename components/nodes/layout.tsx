import { useReactFlow } from "@xyflow/react";
import {
  CodeIcon,
  CopyIcon,
  EyeIcon,
  Loader2Icon,
  PlayIcon,
  TrashIcon,
  type LucideIcon,
} from "lucide-react";
import { type ReactNode, useState } from "react";
import {
  Node,
  NodeContent,
} from "@/components/ai-elements/node";
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { useNodeOperations } from "@/providers/node-operations";

interface NodeLayoutProps {
  children: ReactNode;
  id: string;
  data?: Record<string, unknown> & {
    model?: string;
    source?: string;
    generated?: object;
    instructions?: string;
  };
  title: string;
  subtitle?: string;
  type: string;
  icon?: LucideIcon;
  iconColor?: string;
  toolbar?: {
    tooltip?: string;
    children: ReactNode;
  }[];
  className?: string;
  modelSelector?: ReactNode;
  onRun?: () => void;
  running?: boolean;
  showInstructions?: boolean;
  onInstructionsChange?: (value: string) => void;
  inputs?: { label: string; source?: string }[];
  footer?: ReactNode;
}

export const NodeLayout = ({
  children,
  type,
  id,
  data,
  title,
  subtitle,
  icon: Icon,
  iconColor,
  className,
  modelSelector,
  onRun,
  running,
  showInstructions = false,
  onInstructionsChange,
  inputs,
  footer,
}: NodeLayoutProps) => {
  const { deleteElements, setCenter, getNode, updateNode } = useReactFlow();
  const { duplicateNode } = useNodeOperations();
  const [showData, setShowData] = useState(false);

  const handleFocus = () => {
    const node = getNode(id);

    if (!node) {
      return;
    }

    const { x, y } = node.position;
    const width = node.measured?.width ?? 0;

    setCenter(x + width / 2, y, {
      duration: 1000,
    });
  };

  const handleDelete = () => {
    deleteElements({
      nodes: [{ id }],
    });
  };

  const handleShowData = () => {
    setTimeout(() => {
      setShowData(true);
    }, 100);
  };

  const handleSelect = (open: boolean) => {
    if (!open) {
      return;
    }

    const node = getNode(id);

    if (!node) {
      return;
    }

    if (!node.selected) {
      updateNode(id, { selected: true });
    }
  };

  return (
    <>
      <ContextMenu onOpenChange={handleSelect}>
        <ContextMenuTrigger>
          <Node
            className={cn(
              className,
              "rounded-lg bg-card shadow-[0_0_50px_rgba(0,0,0,0.1)]"
            )}
            handles={{
              target: true,
              source: type !== "video",
            }}
          >
            {/* HEADER */}
            {type !== "drop" && (
              <div className="flex items-center gap-2.5 border-b border-border px-4 py-3">
                {Icon && (
                  <div
                    className="flex size-6 items-center justify-center rounded"
                    style={{ backgroundColor: iconColor ? `${iconColor}20` : undefined }}
                  >
                    <Icon size={14} style={{ color: iconColor }} />
                  </div>
                )}
                <div className="flex flex-col">
                  <span className="text-sm font-medium text-foreground">{title}</span>
                  {subtitle && (
                    <span className="text-[11px] text-muted-foreground">{subtitle}</span>
                  )}
                </div>
              </div>
            )}

            {/* MODEL SELECTOR */}
            {modelSelector && (
              <div className="border-b border-border px-4 py-2.5">
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                    Model
                  </span>
                  <div className="flex-1">{modelSelector}</div>
                </div>
              </div>
            )}

            {/* INSTRUCTIONS */}
            {showInstructions && (
              <div className="border-b border-border px-4 py-3">
                <span className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Instructions
                </span>
                <textarea
                  className="nowheel w-full resize-none rounded-md border border-border bg-secondary/50 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50"
                  onChange={(e) => onInstructionsChange?.(e.target.value)}
                  placeholder="Enter instructions..."
                  rows={3}
                  value={(data?.instructions as string) ?? ""}
                />
              </div>
            )}

            {/* INPUTS */}
            {inputs && inputs.length > 0 && (
              <div className="border-b border-border px-4 py-3">
                <span className="mb-2 block text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
                  Inputs
                </span>
                <div className="space-y-1.5">
                  {inputs.map((input, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-2 text-xs text-muted-foreground"
                    >
                      <div className="size-1.5 rounded-full bg-primary" />
                      <span>{input.label}</span>
                      {input.source && (
                        <span className="text-[11px] text-muted-foreground/60">
                          from: {input.source}
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* CONTENT */}
            <NodeContent className="rounded-none border-none p-0">
              <div className="overflow-hidden">{children}</div>
            </NodeContent>

            {/* FOOTER with Run button */}
            {(onRun || footer) && (
              <div className="flex items-center justify-between border-t border-border px-4 py-2.5">
                <div className="flex items-center gap-2">{footer}</div>
                {onRun && (
                  <button
                    className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-normal text-foreground transition-colors hover:bg-secondary/80 disabled:opacity-50"
                    disabled={running}
                    onClick={onRun}
                  >
                    {running ? (
                      <Loader2Icon className="size-3.5 animate-spin" />
                    ) : (
                      <PlayIcon className="size-3.5" />
                    )}
                    <span>{running ? "Running..." : "Run"}</span>
                  </button>
                )}
              </div>
            )}
          </Node>
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem onClick={() => duplicateNode(id)}>
            <CopyIcon size={12} />
            <span>Duplicate</span>
          </ContextMenuItem>
          <ContextMenuItem onClick={handleFocus}>
            <EyeIcon size={12} />
            <span>Focus</span>
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={handleDelete} variant="destructive">
            <TrashIcon size={12} />
            <span>Delete</span>
          </ContextMenuItem>
          {process.env.NODE_ENV === "development" && (
            <>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={handleShowData}>
                <CodeIcon size={12} />
                <span>Show data</span>
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
      <Dialog onOpenChange={setShowData} open={showData}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Node data</DialogTitle>
            <DialogDescription>
              Data for node{" "}
              <code className="rounded-sm bg-secondary px-2 py-1 font-mono">
                {id}
              </code>
            </DialogDescription>
          </DialogHeader>
          <pre className="overflow-x-auto rounded-lg bg-secondary p-4 text-sm text-foreground">
            {JSON.stringify(data, null, 2)}
          </pre>
        </DialogContent>
      </Dialog>
    </>
  );
};
