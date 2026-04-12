"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getPlatformFormats,
  groupByPlatform,
  type PlatformFormat,
} from "@/lib/platform-formats";

interface PlatformSelectorProps {
  selectedFormats: string[];
  onSelectionChange: (ids: string[]) => void;
}

const PLATFORM_LABELS: Record<string, string> = {
  instagram: "Instagram",
  linkedin: "LinkedIn",
  twitter: "Twitter / X",
  facebook: "Facebook",
  youtube: "YouTube",
  tiktok: "TikTok",
  pinterest: "Pinterest",
  whatsapp: "WhatsApp",
  threads: "Threads",
};

export function PlatformSelector({
  selectedFormats,
  onSelectionChange,
}: PlatformSelectorProps) {
  const formats = useMemo(() => getPlatformFormats(), []);
  const grouped = useMemo(() => groupByPlatform(formats), [formats]);

  const selectedSet = useMemo(
    () => new Set(selectedFormats),
    [selectedFormats]
  );

  function toggle(id: string) {
    if (selectedSet.has(id)) {
      onSelectionChange(selectedFormats.filter((f) => f !== id));
    } else {
      onSelectionChange([...selectedFormats, id]);
    }
  }

  function selectAll() {
    onSelectionChange(formats.map((f) => f.id));
  }

  function clearAll() {
    onSelectionChange([]);
  }

  return (
    <div className="flex flex-col gap-3 text-sm">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-medium">Formats</span>
          <span
            className={cn(
              "inline-flex items-center justify-center rounded-full px-2 py-0.5 text-xs font-medium",
              selectedFormats.length > 0
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground"
            )}
          >
            {selectedFormats.length}
          </span>
        </div>
        <div className="flex gap-1">
          <Button variant="ghost" size="sm" onClick={selectAll}>
            Select All
          </Button>
          <Button variant="ghost" size="sm" onClick={clearAll}>
            Clear
          </Button>
        </div>
      </div>

      {/* Platform groups */}
      <div className="flex flex-col gap-4">
        {Object.entries(grouped).map(([platform, platformFormats]) => (
          <div key={platform} className="flex flex-col gap-1.5">
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {PLATFORM_LABELS[platform] ?? platform}
            </span>
            <div className="flex flex-wrap gap-1.5">
              {platformFormats.map((format) => {
                const isSelected = selectedSet.has(format.id);
                return (
                  <button
                    key={format.id}
                    type="button"
                    onClick={() => toggle(format.id)}
                    className={cn(
                      "inline-flex flex-col items-start rounded-md border px-2.5 py-1.5 text-xs transition-all",
                      "hover:bg-accent hover:text-accent-foreground",
                      isSelected
                        ? "border-primary bg-primary/10 ring-1 ring-primary text-foreground"
                        : "border-border bg-background text-muted-foreground"
                    )}
                  >
                    <span className="font-medium leading-tight">
                      {format.format_name}
                    </span>
                    <span className="text-[10px] opacity-70">
                      {format.width}x{format.height} ({format.aspect_ratio})
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
