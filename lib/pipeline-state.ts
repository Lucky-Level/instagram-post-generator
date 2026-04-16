import { atom } from "jotai";

// --- Types ---

export type EtapaId =
  | "briefing"
  | "copy"
  | "layout"
  | "avatar"
  | "visual"
  | "compose"
  | "review";

export type NodeStatus = "pending" | "running" | "done" | "error" | "skipped";

export interface PipelineNodeData {
  id: string;
  etapa: EtapaId;
  type: string;
  label: string;
  status: NodeStatus;
  data: Record<string, unknown>;
  updatedAt?: string;
}

export interface PipelineState {
  nodes: Record<string, PipelineNodeData>;
  activeNodeId: string | null;
  etapaOrder: EtapaId[];
  runMode: "auto" | "manual";
  createdAt: string;
}

export interface EtapaNodeTemplate {
  type: string;
  label: string;
  icon: string;
  defaultData: Record<string, unknown>;
}

export interface EtapaDefinition {
  id: EtapaId;
  label: string;
  color: string;
  nodes: EtapaNodeTemplate[];
}

// --- Etapa Definitions ---

export const ETAPA_DEFINITIONS: EtapaDefinition[] = [
  {
    id: "briefing",
    label: "Briefing",
    color: "#3b82f6",
    nodes: [
      {
        type: "brand-check",
        label: "Brand Check",
        icon: "shield-check",
        defaultData: { brandId: null, valid: false },
      },
      {
        type: "pesquisa",
        label: "Pesquisa",
        icon: "search",
        defaultData: { keywords: [], references: [] },
      },
      {
        type: "questionario",
        label: "Questionario",
        icon: "clipboard-list",
        defaultData: { answers: {}, complete: false },
      },
      {
        type: "briefing-final",
        label: "Briefing Final",
        icon: "file-text",
        defaultData: { summary: "", approved: false },
      },
    ],
  },
  {
    id: "copy",
    label: "Copy",
    color: "#8b5cf6",
    nodes: [
      {
        type: "perfil-copy",
        label: "Perfil Copy",
        icon: "user-pen",
        defaultData: { tone: "", audience: "", guidelines: "" },
      },
      {
        type: "gerar-textos",
        label: "Gerar Textos",
        icon: "sparkles",
        defaultData: { variants: [], selectedIndex: null },
      },
      {
        type: "copy-final",
        label: "Copy Final",
        icon: "check-circle",
        defaultData: { headline: "", subtitle: "", cta: "", caption: "" },
      },
    ],
  },
  {
    id: "layout",
    label: "Layout",
    color: "#ec4899",
    nodes: [
      {
        type: "buscar-refs",
        label: "Buscar Refs",
        icon: "image-search",
        defaultData: { sources: [], results: [] },
      },
      {
        type: "analisar-refs",
        label: "Analisar Refs",
        icon: "scan-eye",
        defaultData: { analysis: "", patterns: [] },
      },
      {
        type: "montar-layout",
        label: "Montar Layout",
        icon: "layout-grid",
        defaultData: { templateId: null, slots: {} },
      },
      {
        type: "layout-final",
        label: "Layout Final",
        icon: "check-circle",
        defaultData: { layoutJson: null, approved: false },
      },
    ],
  },
  {
    id: "avatar",
    label: "Avatar",
    color: "#f97316",
    nodes: [
      {
        type: "selecionar-avatar",
        label: "Selecionar Avatar",
        icon: "user-circle",
        defaultData: { avatarUrl: null, source: "" },
      },
      {
        type: "analisar-face",
        label: "Analisar Face",
        icon: "scan-face",
        defaultData: { faceData: null, quality: null },
      },
      {
        type: "gerar-variacao",
        label: "Gerar Variacao",
        icon: "wand",
        defaultData: { prompt: "", resultUrl: null },
      },
      {
        type: "avatar-final",
        label: "Avatar Final",
        icon: "check-circle",
        defaultData: { finalUrl: null, approved: false },
      },
    ],
  },
  {
    id: "visual",
    label: "Visual",
    color: "#f59e0b",
    nodes: [
      {
        type: "prompt-visual",
        label: "Prompt Visual",
        icon: "pencil",
        defaultData: { prompt: "", negativePrompt: "", model: "flux-kontext" },
      },
      {
        type: "gerar-imagens",
        label: "Gerar Imagens",
        icon: "image-plus",
        defaultData: { images: [], count: 4 },
      },
      {
        type: "refinar-imagem",
        label: "Refinar Imagem",
        icon: "paintbrush",
        defaultData: { selectedIndex: null, refinedUrl: null },
      },
      {
        type: "visual-final",
        label: "Visual Final",
        icon: "check-circle",
        defaultData: { finalUrl: null, approved: false },
      },
    ],
  },
  {
    id: "compose",
    label: "Compose",
    color: "#10b981",
    nodes: [
      {
        type: "aplicar-layout",
        label: "Aplicar Layout",
        icon: "layers",
        defaultData: { canvasJson: null, applied: false },
      },
      {
        type: "renderizar",
        label: "Renderizar",
        icon: "monitor",
        defaultData: { previewUrl: null, format: "1080x1080" },
      },
      {
        type: "ajuste-fino",
        label: "Ajuste Fino",
        icon: "sliders",
        defaultData: { adjustments: {}, iterations: 0 },
      },
      {
        type: "compose-final",
        label: "Compose Final",
        icon: "check-circle",
        defaultData: { outputUrl: null, approved: false },
      },
    ],
  },
  {
    id: "review",
    label: "Review",
    color: "#06b6d4",
    nodes: [
      {
        type: "preview-multi",
        label: "Preview Multi",
        icon: "smartphone",
        defaultData: { platforms: [], previews: {} },
      },
      {
        type: "checklist",
        label: "Checklist",
        icon: "list-checks",
        defaultData: { items: [], passRate: 0 },
      },
      {
        type: "export",
        label: "Export",
        icon: "download",
        defaultData: { formats: [], files: [] },
      },
      {
        type: "salvar-brand",
        label: "Salvar Brand",
        icon: "save",
        defaultData: { saved: false, brandUpdateId: null },
      },
    ],
  },
];

// --- Atoms ---

export const pipelineStateAtom = atom<PipelineState | null>(null);

export const runModeAtom = atom<"auto" | "manual">("auto");

export const activeNodeAtom = atom<PipelineNodeData | null>((get) => {
  const state = get(pipelineStateAtom);
  if (!state || !state.activeNodeId) return null;
  return state.nodes[state.activeNodeId] ?? null;
});

export const propsPanelOpenAtom = atom<boolean>((get) => {
  return get(activeNodeAtom) !== null;
});

export const updatePipelineNodeAtom = atom(
  null,
  (
    get,
    set,
    update: {
      nodeId: string;
      status?: NodeStatus;
      data?: Record<string, unknown>;
    }
  ) => {
    const state = get(pipelineStateAtom);
    if (!state || !state.nodes[update.nodeId]) return;

    const node = state.nodes[update.nodeId];
    const updatedNode: PipelineNodeData = {
      ...node,
      ...(update.status !== undefined && { status: update.status }),
      ...(update.data !== undefined && {
        data: { ...node.data, ...update.data },
      }),
      updatedAt: new Date().toISOString(),
    };

    set(pipelineStateAtom, {
      ...state,
      nodes: { ...state.nodes, [update.nodeId]: updatedNode },
    });
  }
);

export const setActiveNodeAtom = atom(
  null,
  (get, set, nodeId: string | null) => {
    const prev = get(pipelineStateAtom);
    if (!prev) return;
    set(pipelineStateAtom, { ...prev, activeNodeId: nodeId });
  }
);

export const createPipelineAtom = atom(
  null,
  (
    _get,
    set,
    params: { includeAvatar: boolean; runMode: "auto" | "manual" }
  ) => {
    const nodes: Record<string, PipelineNodeData> = {};
    const etapaOrder: EtapaId[] = [];

    for (const etapa of ETAPA_DEFINITIONS) {
      if (etapa.id === "avatar" && !params.includeAvatar) continue;
      etapaOrder.push(etapa.id);

      for (const template of etapa.nodes) {
        const nodeId = `${etapa.id}-${template.type}`;
        nodes[nodeId] = {
          id: nodeId,
          etapa: etapa.id,
          type: template.type,
          label: template.label,
          status: "pending",
          data: { ...template.defaultData },
        };
      }
    }

    const state: PipelineState = {
      nodes,
      activeNodeId: null,
      etapaOrder,
      runMode: params.runMode,
      createdAt: new Date().toISOString(),
    };

    set(pipelineStateAtom, state);
    set(runModeAtom, params.runMode);
  }
);

// --- Helpers ---

export function getPipelineSummary(state: PipelineState): string {
  const lines: string[] = [`RunMode: ${state.runMode}`];
  for (const etapaId of state.etapaOrder) {
    const etapaDef = ETAPA_DEFINITIONS.find((e) => e.id === etapaId);
    if (!etapaDef) continue;

    const etapaNodes = Object.values(state.nodes).filter(
      (n) => n.etapa === etapaId
    );
    lines.push(`\n[${etapaDef.label}]`);
    for (const node of etapaNodes) {
      const dataEntries = Object.entries(node.data).filter(
        ([, v]) => v !== null && v !== "" && v !== false && !(Array.isArray(v) && v.length === 0) && !(typeof v === "object" && v !== null && !Array.isArray(v) && Object.keys(v).length === 0)
      );
      const dataStr = dataEntries.length > 0
        ? ` | ${dataEntries.map(([k, v]) => `${k}=${typeof v === "string" ? v.slice(0, 80) : JSON.stringify(v)}`).join(", ")}`
        : "";
      lines.push(`  ${node.id} [${node.status}]${dataStr}`);
    }
  }
  return lines.join("\n");
}
