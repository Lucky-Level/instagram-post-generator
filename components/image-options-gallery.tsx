"use client";

import { cn } from "@/lib/utils";
import { CheckIcon } from "lucide-react";

export interface ImageOption {
  url: string;
  description?: string;
  provider?: string;
  variationIndex?: number;
}

interface ImageOptionsGalleryProps {
  options: ImageOption[];
  selectedIndex: number | null;
  onSelect: (index: number) => void;
}

export function ImageOptionsGallery({ options, selectedIndex, onSelect }: ImageOptionsGalleryProps) {
  if (options.length <= 1) return null;

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        {options.length} opcoes geradas — clique pra escolher:
      </p>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {options.map((opt, i) => (
          <button
            key={i}
            onClick={() => onSelect(i)}
            className={cn(
              "relative shrink-0 overflow-hidden rounded-lg border-2 transition-all",
              selectedIndex === i
                ? "border-primary ring-2 ring-primary/30"
                : "border-border hover:border-primary/50",
            )}
            style={{ width: 140, height: 140 }}
          >
            <img
              src={opt.url}
              alt={`Opcao ${i + 1}`}
              className="size-full object-cover"
            />
            {selectedIndex === i && (
              <div className="absolute inset-0 flex items-center justify-center bg-primary/20">
                <CheckIcon className="size-6 text-primary" />
              </div>
            )}
            <div className="absolute bottom-0 left-0 right-0 bg-black/60 px-2 py-1">
              <span className="text-[10px] text-white">Opcao {i + 1}</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
