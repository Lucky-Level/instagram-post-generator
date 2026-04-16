"use client";

import { XIcon } from "lucide-react";
import { useAtom } from "jotai";
import {
  providerConfigAtom,
  type ImageProvider,
  type ProviderConfig,
} from "@/lib/provider-config";
import { cn } from "@/lib/utils";

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

const PROVIDERS: { value: ImageProvider; label: string; desc: string }[] = [
  { value: "auto", label: "Auto (recomendado)", desc: "Escolhe o melhor provider disponivel" },
  { value: "nano-banana", label: "Nano Banana (Gemini)", desc: "Google Gemini — rapido e gratuito" },
  { value: "flux-kontext", label: "FLUX Kontext Pro", desc: "Replicate — alta qualidade" },
  { value: "cloudflare", label: "Cloudflare", desc: "Workers AI — rapido, sem chave" },
  { value: "pollinations", label: "Pollinations", desc: "Open source, gratuito" },
];

export function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const [config, setConfig] = useAtom(providerConfigAtom);

  const update = (partial: Partial<ProviderConfig>) => {
    setConfig((prev) => ({ ...prev, ...partial }));
  };

  const updateKey = (key: keyof ProviderConfig["apiKeys"], value: string) => {
    setConfig((prev) => ({
      ...prev,
      apiKeys: { ...prev.apiKeys, [key]: value },
    }));
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          "fixed inset-0 z-50 bg-black/40 transition-opacity duration-200",
          open ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={onClose}
      />

      {/* Panel */}
      <div
        className={cn(
          "fixed right-0 top-0 z-50 h-full w-full max-w-sm bg-background border-l border-border shadow-xl transition-transform duration-200 ease-out flex flex-col",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 h-12 border-b border-border shrink-0">
          <h2 className="text-sm font-semibold text-foreground">Configuracoes</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <XIcon className="size-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-4 py-5 space-y-6">
          {/* Provider Selection */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Provider de Imagem
            </h3>
            <div className="space-y-1.5">
              {PROVIDERS.map((p) => (
                <label
                  key={p.value}
                  className={cn(
                    "flex items-start gap-3 rounded-lg border px-3 py-2.5 cursor-pointer transition-colors",
                    config.preferredProvider === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:border-primary/40"
                  )}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.value}
                    checked={config.preferredProvider === p.value}
                    onChange={() => update({ preferredProvider: p.value })}
                    className="mt-0.5 accent-primary"
                  />
                  <div className="min-w-0">
                    <div className="text-sm font-medium text-foreground">{p.label}</div>
                    <div className="text-xs text-muted-foreground">{p.desc}</div>
                  </div>
                </label>
              ))}
            </div>
          </section>

          {/* API Keys */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Chaves de API
            </h3>
            <div className="space-y-3">
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Google AI (Nano Banana)
                </label>
                <input
                  type="password"
                  placeholder="AIza..."
                  value={config.apiKeys.google ?? ""}
                  onChange={(e) => updateKey("google", e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">
                  Replicate (FLUX Kontext)
                </label>
                <input
                  type="password"
                  placeholder="r8_..."
                  value={config.apiKeys.replicate ?? ""}
                  onChange={(e) => updateKey("replicate", e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs font-medium text-foreground">fal.ai</label>
                <input
                  type="password"
                  placeholder="fal-..."
                  value={config.apiKeys.fal ?? ""}
                  onChange={(e) => updateKey("fal", e.target.value)}
                  className="w-full rounded-md border border-border bg-secondary/40 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
          </section>

          {/* Quality */}
          <section className="space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Qualidade
            </h3>
            <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => update({ quality: "draft" })}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  config.quality === "draft"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Rascunho (rapido)
              </button>
              <button
                onClick={() => update({ quality: "final" })}
                className={cn(
                  "flex-1 px-3 py-1.5 rounded-md text-xs font-medium transition-colors",
                  config.quality === "final"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                )}
              >
                Final (alta qualidade)
              </button>
            </div>
          </section>

          {/* Num Options */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Opcoes por geracao
              </h3>
              <span className="text-sm font-semibold text-primary tabular-nums">
                {config.numOptions}
              </span>
            </div>
            <input
              type="range"
              min={1}
              max={4}
              step={1}
              value={config.numOptions}
              onChange={(e) => update({ numOptions: Number(e.target.value) })}
              className="w-full accent-primary"
            />
            <div className="flex justify-between text-[10px] text-muted-foreground px-0.5">
              <span>1</span>
              <span>2</span>
              <span>3</span>
              <span>4</span>
            </div>
          </section>
        </div>
      </div>
    </>
  );
}
