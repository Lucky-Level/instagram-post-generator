"use client";

import { useAtom, useSetAtom } from "jotai";
import {
  XIcon,
  RefreshCwIcon,
  RotateCcwIcon,
  MousePointerClickIcon,
} from "lucide-react";
import { useCallback, useMemo } from "react";
import {
  activeNodeAtom,
  setActiveNodeAtom,
  updatePipelineNodeAtom,
  ETAPA_DEFINITIONS,
  type PipelineNodeData,
  type NodeStatus,
  type EtapaId,
} from "@/lib/pipeline-state";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

// ── Helpers ──────────────────────────────────────────────

function etapaColor(etapaId: EtapaId): string {
  return ETAPA_DEFINITIONS.find((e) => e.id === etapaId)?.color ?? "#6b7280";
}

const STATUS_LABELS: Record<NodeStatus, string> = {
  pending: "Pendente",
  running: "Rodando",
  done: "Concluido",
  error: "Erro",
  skipped: "Pulado",
};

const STATUS_CLASSES: Record<NodeStatus, string> = {
  pending: "bg-muted text-muted-foreground",
  running: "bg-yellow-500/20 text-yellow-400",
  done: "bg-green-500/20 text-green-400",
  error: "bg-red-500/20 text-red-400",
  skipped: "bg-muted text-muted-foreground/60",
};

// ── Reusable Field Components ────────────────────────────

function FieldSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
        {title}
      </h4>
      {children}
    </div>
  );
}

function FieldInput({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

function FieldTextarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full resize-none rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      />
    </label>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-md border border-input bg-background px-3 py-1.5 text-sm outline-none focus:ring-1 focus:ring-ring"
      >
        <option value="">Selecionar...</option>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ChipSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap gap-1.5">
        {options.map((opt) => (
          <button
            key={opt}
            type="button"
            onClick={() => onChange(opt === value ? "" : opt)}
            className={cn(
              "rounded-full border px-3 py-1 text-xs transition-colors",
              opt === value
                ? "border-primary bg-primary/20 text-primary"
                : "border-input bg-background text-muted-foreground hover:border-primary/50"
            )}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function ToggleRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between py-1">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors",
          checked ? "bg-primary" : "bg-muted"
        )}
      >
        <span
          className={cn(
            "pointer-events-none block size-4 rounded-full bg-background shadow-sm transition-transform",
            checked ? "translate-x-4" : "translate-x-0"
          )}
        />
      </button>
    </label>
  );
}

function StatusText({ text }: { text: string }) {
  return (
    <p className="text-sm text-muted-foreground italic">{text}</p>
  );
}

// ── Node Field Groups ────────────────────────────────────

type FieldProps = {
  node: PipelineNodeData;
  onUpdate: (data: Record<string, unknown>) => void;
};

function BriefingFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "brand-check") {
    return (
      <FieldSection title="Brand Check">
        <StatusText
          text={
            d.valid
              ? "Brand validada com sucesso."
              : "Aguardando validacao da brand."
          }
        />
      </FieldSection>
    );
  }

  if (node.type === "pesquisa") {
    return (
      <FieldSection title="Pesquisa">
        <FieldInput
          label="Query"
          value={String(d.query ?? "")}
          onChange={(v) => onUpdate({ query: v })}
          placeholder="O que pesquisar..."
        />
        <FieldTextarea
          label="Descobertas"
          value={
            Array.isArray(d.findings) ? (d.findings as string[]).join("\n") : ""
          }
          onChange={(v) =>
            onUpdate({ findings: v.split("\n").filter(Boolean) })
          }
          placeholder="Uma descoberta por linha"
        />
      </FieldSection>
    );
  }

  // questionario / briefing-final
  const TIPO_OPTIONS = [
    { value: "post-instagram", label: "Post Instagram" },
    { value: "story", label: "Story" },
    { value: "thumbnail-yt", label: "Thumbnail YT" },
    { value: "carousel", label: "Carousel" },
    { value: "reels-cover", label: "Reels Cover" },
  ];

  const ESTILO_OPTIONS = [
    "Vibrante",
    "Minimalista",
    "Elegante",
    "Ousado",
    "Organico",
  ];

  return (
    <FieldSection title={node.label}>
      <FieldSelect
        label="Tipo"
        value={String(d.tipo ?? "")}
        onChange={(v) => onUpdate({ tipo: v })}
        options={TIPO_OPTIONS}
      />
      <FieldInput
        label="Tema"
        value={String(d.tema ?? "")}
        onChange={(v) => onUpdate({ tema: v })}
        placeholder="Tema do post"
      />
      <FieldInput
        label="Publico"
        value={String(d.publico ?? "")}
        onChange={(v) => onUpdate({ publico: v })}
        placeholder="Publico-alvo"
      />
      <FieldInput
        label="Avatar"
        value={String(d.avatar ?? "")}
        onChange={(v) => onUpdate({ avatar: v })}
        placeholder="Nome do avatar"
      />
      <ChipSelect
        label="Estilo"
        value={String(d.estilo ?? "")}
        onChange={(v) => onUpdate({ estilo: v })}
        options={ESTILO_OPTIONS}
      />
      {node.type === "briefing-final" && (
        <FieldTextarea
          label="Resumo"
          value={String(d.summary ?? "")}
          onChange={(v) => onUpdate({ summary: v })}
          placeholder="Resumo final do briefing"
          rows={4}
        />
      )}
    </FieldSection>
  );
}

function CopyFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "perfil-copy") {
    const TOM_OPTIONS = [
      "Direto",
      "Emocional",
      "Divertido",
      "Urgente",
      "Inspirador",
      "Educativo",
    ];
    return (
      <FieldSection title="Perfil Copy">
        <ChipSelect
          label="Tom"
          value={String(d.tone ?? "")}
          onChange={(v) => onUpdate({ tone: v })}
          options={TOM_OPTIONS}
        />
        <FieldTextarea
          label="Perfil"
          value={String(d.guidelines ?? "")}
          onChange={(v) => onUpdate({ guidelines: v })}
          placeholder="Diretrizes de copy..."
          rows={4}
        />
      </FieldSection>
    );
  }

  // gerar-textos / copy-final
  const FONT_OPTIONS = [
    { value: "inter", label: "Inter" },
    { value: "poppins", label: "Poppins" },
    { value: "montserrat", label: "Montserrat" },
    { value: "playfair", label: "Playfair Display" },
    { value: "bebas", label: "Bebas Neue" },
  ];

  const variants = Array.isArray(d.variants)
    ? (d.variants as string[])
    : [];

  return (
    <FieldSection title={node.label}>
      <FieldInput
        label="Headline"
        value={String(d.headline ?? "")}
        onChange={(v) => onUpdate({ headline: v })}
        placeholder="Titulo principal"
      />
      <FieldInput
        label="CTA"
        value={String(d.cta ?? "")}
        onChange={(v) => onUpdate({ cta: v })}
        placeholder="Call to action"
      />
      {variants.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Variantes</span>
          <div className="space-y-1">
            {variants.map((v, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onUpdate({ selectedIndex: i, headline: v })}
                className={cn(
                  "w-full rounded-md border p-2 text-left text-xs transition-colors",
                  d.selectedIndex === i
                    ? "border-primary bg-primary/10"
                    : "border-input hover:border-primary/50"
                )}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}
      <FieldSelect
        label="Fonte"
        value={String(d.font ?? "")}
        onChange={(v) => onUpdate({ font: v })}
        options={FONT_OPTIONS}
      />
      <FieldInput
        label="Cor do texto"
        value={String(d.color ?? "")}
        onChange={(v) => onUpdate({ color: v })}
        placeholder="#ffffff"
      />
      <ToggleRow
        label="Sombra"
        checked={Boolean(d.shadow)}
        onChange={(v) => onUpdate({ shadow: v })}
      />
      <ToggleRow
        label="Maiusculas"
        checked={Boolean(d.uppercase)}
        onChange={(v) => onUpdate({ uppercase: v })}
      />
    </FieldSection>
  );
}

function LayoutFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "buscar-refs" || node.type === "analisar-refs") {
    const refs = Array.isArray(d.results)
      ? (d.results as string[])
      : [];
    return (
      <FieldSection title={node.label}>
        {refs.length > 0 ? (
          <div className="grid grid-cols-3 gap-1">
            {refs.map((url, i) => (
              <div
                key={i}
                className="aspect-square rounded border border-input bg-muted"
                style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
              />
            ))}
          </div>
        ) : (
          <StatusText text="Nenhuma referencia encontrada ainda." />
        )}
        <ToggleRow
          label="Auto-analisar"
          checked={Boolean(d.autoAnalyze)}
          onChange={(v) => onUpdate({ autoAnalyze: v })}
        />
      </FieldSection>
    );
  }

  // montar-layout / layout-final
  return (
    <FieldSection title={node.label}>
      <FieldTextarea
        label="Grid / Layout JSON"
        value={
          typeof d.layoutJson === "string"
            ? d.layoutJson
            : d.layoutJson
              ? JSON.stringify(d.layoutJson, null, 2)
              : ""
        }
        onChange={(v) => onUpdate({ layoutJson: v })}
        placeholder="Definicao do layout..."
        rows={6}
      />
    </FieldSection>
  );
}

function AvatarFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "selecionar-avatar") {
    return (
      <FieldSection title="Selecionar Avatar">
        <FieldInput
          label="Nome do avatar"
          value={String(d.source ?? "")}
          onChange={(v) => onUpdate({ source: v })}
          placeholder="Nome ou ID"
        />
        {typeof d.avatarUrl === "string" && d.avatarUrl && (
          <div className="mt-2 overflow-hidden rounded-md border border-input">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={String(d.avatarUrl)}
              alt="Avatar"
              className="h-32 w-full object-cover"
            />
          </div>
        )}
      </FieldSection>
    );
  }

  if (node.type === "analisar-face") {
    return (
      <FieldSection title="Analisar Face">
        <FieldTextarea
          label="Prompt descritivo"
          value={String(d.prompt ?? "")}
          onChange={(v) => onUpdate({ prompt: v })}
          placeholder="Descricao do rosto para IA..."
          rows={4}
        />
        {typeof d.descriptor === "string" && d.descriptor && (
          <div className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
            {String(d.descriptor)}
          </div>
        )}
      </FieldSection>
    );
  }

  // gerar-variacao / avatar-final
  const POSE_OPTIONS = ["Frontal", "Perfil", "3/4", "Olhando pra cima", "Sentado"];
  const EXPRESSION_OPTIONS = ["Neutro", "Sorrindo", "Serio", "Confiante", "Pensativo"];

  const options = Array.isArray(d.options) ? (d.options as string[]) : [];

  return (
    <FieldSection title={node.label}>
      <ChipSelect
        label="Pose"
        value={String(d.pose ?? "")}
        onChange={(v) => onUpdate({ pose: v })}
        options={POSE_OPTIONS}
      />
      <ChipSelect
        label="Expressao"
        value={String(d.expression ?? "")}
        onChange={(v) => onUpdate({ expression: v })}
        options={EXPRESSION_OPTIONS}
      />
      {options.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Opcoes geradas</span>
          <div className="grid grid-cols-2 gap-1">
            {options.map((url, i) => (
              <div
                key={i}
                className="aspect-square cursor-pointer rounded border border-input bg-muted hover:border-primary"
                style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onClick={() => onUpdate({ selectedIndex: i })}
              />
            ))}
          </div>
        </div>
      )}
    </FieldSection>
  );
}

function VisualFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "refinar-imagem" || node.type === "visual-final") {
    return (
      <FieldSection title={node.label}>
        <FieldTextarea
          label="Ajustes"
          value={String(d.adjustments ?? "")}
          onChange={(v) => onUpdate({ adjustments: v })}
          placeholder="Instrucoes de refinamento..."
          rows={4}
        />
      </FieldSection>
    );
  }

  // prompt-visual / gerar-imagens
  const PROVIDER_OPTIONS = ["flux-kontext", "nano-banana", "cloudflare", "pollinations"];
  const images = Array.isArray(d.images) ? (d.images as string[]) : [];

  return (
    <FieldSection title={node.label}>
      <FieldTextarea
        label="Prompt"
        value={String(d.prompt ?? "")}
        onChange={(v) => onUpdate({ prompt: v })}
        placeholder="Descreva a imagem..."
        rows={4}
      />
      <ChipSelect
        label="Provider"
        value={String(d.model ?? d.provider ?? "")}
        onChange={(v) => onUpdate({ model: v })}
        options={PROVIDER_OPTIONS}
      />
      <ToggleRow
        label="Incluir avatar"
        checked={Boolean(d.includeAvatar)}
        onChange={(v) => onUpdate({ includeAvatar: v })}
      />
      <div className="space-y-1">
        <label className="flex items-center justify-between">
          <span className="text-xs text-muted-foreground">Quantidade</span>
          <span className="text-xs font-mono">
            {Number(d.count ?? d.numOptions ?? 4)}
          </span>
        </label>
        <input
          type="range"
          min={1}
          max={8}
          value={Number(d.count ?? d.numOptions ?? 4)}
          onChange={(e) => onUpdate({ count: Number(e.target.value) })}
          className="w-full accent-primary"
        />
      </div>
      {images.length > 0 && (
        <div className="space-y-1">
          <span className="text-xs text-muted-foreground">Imagens geradas</span>
          <div className="grid grid-cols-2 gap-1">
            {images.map((url, i) => (
              <div
                key={i}
                className="aspect-square cursor-pointer rounded border border-input bg-muted hover:border-primary"
                style={{
                  backgroundImage: `url(${url})`,
                  backgroundSize: "cover",
                  backgroundPosition: "center",
                }}
                onClick={() => onUpdate({ selectedIndex: i })}
              />
            ))}
          </div>
        </div>
      )}
    </FieldSection>
  );
}

function ComposeFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "renderizar") {
    const layers = Array.isArray(d.layers)
      ? (d.layers as { name: string; color: string; opacity: number }[])
      : [];
    return (
      <FieldSection title="Renderizar">
        {layers.length > 0 ? (
          <div className="space-y-1">
            {layers.map((layer, i) => (
              <button
                key={i}
                type="button"
                onClick={() => onUpdate({ selectedLayerIdx: i })}
                className={cn(
                  "flex w-full items-center gap-2 rounded-md border p-2 text-xs transition-colors",
                  d.selectedLayerIdx === i
                    ? "border-primary bg-primary/10"
                    : "border-input hover:border-primary/50"
                )}
              >
                <span
                  className="size-3 rounded-full"
                  style={{ backgroundColor: layer.color }}
                />
                <span className="flex-1 text-left">{layer.name}</span>
                <span className="text-muted-foreground">
                  {Math.round(layer.opacity * 100)}%
                </span>
              </button>
            ))}
          </div>
        ) : (
          <StatusText text="Nenhuma layer definida." />
        )}
      </FieldSection>
    );
  }

  // aplicar-layout / ajuste-fino / compose-final
  return (
    <FieldSection title={node.label}>
      <StatusText
        text={
          node.status === "done"
            ? "Etapa concluida."
            : "Aguardando processamento..."
        }
      />
    </FieldSection>
  );
}

function ReviewFields({ node, onUpdate }: FieldProps) {
  const d = node.data as Record<string, unknown>;

  if (node.type === "checklist") {
    const checks = [
      { key: "resolution", label: "Resolucao adequada" },
      { key: "textReadable", label: "Texto legivel" },
      { key: "brandColors", label: "Cores da brand" },
      { key: "safeZone", label: "Safe zone respeitada" },
      { key: "noTypos", label: "Sem erros de digitacao" },
    ];
    return (
      <FieldSection title="Checklist de Qualidade">
        {checks.map((c) => (
          <ToggleRow
            key={c.key}
            label={c.label}
            checked={Boolean(
              (d as Record<string, unknown>)[c.key]
            )}
            onChange={(v) => onUpdate({ [c.key]: v })}
          />
        ))}
      </FieldSection>
    );
  }

  if (node.type === "export") {
    const FORMAT_OPTIONS = [
      { value: "png", label: "PNG" },
      { value: "jpg", label: "JPG" },
      { value: "webp", label: "WebP" },
    ];
    return (
      <FieldSection title="Export">
        <FieldSelect
          label="Formato"
          value={String(d.format ?? "")}
          onChange={(v) => onUpdate({ format: v })}
          options={FORMAT_OPTIONS}
        />
      </FieldSection>
    );
  }

  // preview-multi / salvar-brand
  return (
    <FieldSection title={node.label}>
      <StatusText
        text={
          node.status === "done"
            ? "Etapa concluida."
            : "Aguardando processamento..."
        }
      />
    </FieldSection>
  );
}

// ── NodeFields Router ────────────────────────────────────

function NodeFields({ node, onUpdate }: FieldProps) {
  const BRIEFING_TYPES = ["brand-check", "pesquisa", "questionario", "briefing-final"];
  const COPY_TYPES = ["perfil-copy", "gerar-textos", "copy-final"];
  const LAYOUT_TYPES = ["buscar-refs", "analisar-refs", "montar-layout", "layout-final"];
  const AVATAR_TYPES = ["selecionar-avatar", "analisar-face", "gerar-variacao", "avatar-final"];
  const VISUAL_TYPES = ["prompt-visual", "gerar-imagens", "refinar-imagem", "visual-final"];
  const COMPOSE_TYPES = ["aplicar-layout", "renderizar", "ajuste-fino", "compose-final"];
  const REVIEW_TYPES = ["preview-multi", "checklist", "export", "salvar-brand"];

  if (BRIEFING_TYPES.includes(node.type)) return <BriefingFields node={node} onUpdate={onUpdate} />;
  if (COPY_TYPES.includes(node.type)) return <CopyFields node={node} onUpdate={onUpdate} />;
  if (LAYOUT_TYPES.includes(node.type)) return <LayoutFields node={node} onUpdate={onUpdate} />;
  if (AVATAR_TYPES.includes(node.type)) return <AvatarFields node={node} onUpdate={onUpdate} />;
  if (VISUAL_TYPES.includes(node.type)) return <VisualFields node={node} onUpdate={onUpdate} />;
  if (COMPOSE_TYPES.includes(node.type)) return <ComposeFields node={node} onUpdate={onUpdate} />;
  if (REVIEW_TYPES.includes(node.type)) return <ReviewFields node={node} onUpdate={onUpdate} />;

  return <StatusText text="Tipo de node desconhecido." />;
}

// ── EmptyState ───────────────────────────────────────────

function EmptyState() {
  return (
    <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
      <div className="rounded-full bg-muted p-4">
        <MousePointerClickIcon className="size-6 text-muted-foreground" />
      </div>
      <div className="space-y-1">
        <p className="text-sm font-medium">Nenhum node selecionado</p>
        <p className="text-xs text-muted-foreground">
          De um duplo clique em qualquer node do pipeline pra editar.
        </p>
      </div>
      <div className="mt-2 space-y-1 text-xs text-muted-foreground/60">
        <p>
          <kbd className="rounded border border-input bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            dbl-click
          </kbd>{" "}
          abrir
        </p>
        <p>
          <kbd className="rounded border border-input bg-muted px-1.5 py-0.5 font-mono text-[10px]">
            Esc
          </kbd>{" "}
          fechar
        </p>
      </div>
    </div>
  );
}

// ── Main Component ───────────────────────────────────────

export function PropertiesPanel() {
  const [activeNode] = useAtom(activeNodeAtom);
  const setActiveNode = useSetAtom(setActiveNodeAtom);
  const updateNode = useSetAtom(updatePipelineNodeAtom);

  const color = useMemo(
    () => (activeNode ? etapaColor(activeNode.etapa) : "#6b7280"),
    [activeNode]
  );

  const onUpdate = useCallback(
    (data: Record<string, unknown>) => {
      if (!activeNode) return;
      updateNode({ nodeId: activeNode.id, data });
    },
    [activeNode, updateNode]
  );

  const onRegenerate = useCallback(() => {
    if (!activeNode) return;
    updateNode({ nodeId: activeNode.id, status: "pending" });
  }, [activeNode, updateNode]);

  const onReset = useCallback(() => {
    if (!activeNode) return;
    const etapaDef = ETAPA_DEFINITIONS.find((e) => e.id === activeNode.etapa);
    const template = etapaDef?.nodes.find((n) => n.type === activeNode.type);
    updateNode({
      nodeId: activeNode.id,
      status: "pending",
      data: template?.defaultData ?? {},
    });
  }, [activeNode, updateNode]);

  if (!activeNode) {
    return (
      <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
        <EmptyState />
      </aside>
    );
  }

  return (
    <aside className="flex w-80 shrink-0 flex-col border-l border-border bg-background">
      {/* Header */}
      <div className="flex items-center gap-3 border-b border-border px-4 py-3">
        <span
          className="size-3 shrink-0 rounded"
          style={{ backgroundColor: color }}
        />
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium">{activeNode.label}</p>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium",
            STATUS_CLASSES[activeNode.status]
          )}
        >
          {STATUS_LABELS[activeNode.status]}
        </span>
        <button
          type="button"
          onClick={() => setActiveNode(null)}
          className="shrink-0 rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
        >
          <XIcon className="size-4" />
        </button>
      </div>

      {/* Fields */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
        <NodeFields node={activeNode} onUpdate={onUpdate} />
      </div>

      {/* Actions Footer */}
      <div className="flex items-center gap-2 border-t border-border px-4 py-3">
        <Button size="sm" className="flex-1" onClick={() => onUpdate({})}>
          Salvar
        </Button>
        <Button
          variant="secondary"
          size="sm"
          onClick={onRegenerate}
        >
          <RefreshCwIcon className="size-3.5" />
          Regenerar
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          onClick={onReset}
          className="text-destructive hover:text-destructive"
        >
          <RotateCcwIcon className="size-3.5" />
        </Button>
      </div>
    </aside>
  );
}
