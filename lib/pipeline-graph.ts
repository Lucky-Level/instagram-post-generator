import type { Node, Edge } from "@xyflow/react";
import type { PipelineState, EtapaId } from "./pipeline-state";
import { ETAPA_DEFINITIONS } from "./pipeline-state";

// --- Layout Constants ---

export const ETAPA_X_START = 60;
export const NODE_WIDTH = 220;
export const NODE_GAP_X = 40;
export const ETAPA_GAP_Y = 140;

// --- Graph Builder ---

/**
 * Determines which etapas should be visible.
 * Shows: completed etapas + the first etapa that has any pending node.
 * This creates a progressive reveal as the pipeline advances.
 */
function getVisibleEtapas(state: PipelineState): Set<EtapaId> {
  const visible = new Set<EtapaId>();
  let foundPending = false;

  for (const etapaId of state.etapaOrder) {
    const etapaNodes = Object.values(state.nodes).filter((n) => n.etapa === etapaId);
    const allDone = etapaNodes.every((n) => n.status === "done" || n.status === "skipped");
    const anyActive = etapaNodes.some((n) => n.status !== "pending");

    if (allDone || anyActive) {
      visible.add(etapaId);
    } else if (!foundPending) {
      // Show the first fully-pending etapa (the "next" one)
      visible.add(etapaId);
      foundPending = true;
    }
    // Don't show etapas beyond the first pending one
  }

  // Always show at least the first etapa
  if (visible.size === 0 && state.etapaOrder.length > 0) {
    visible.add(state.etapaOrder[0]);
  }

  return visible;
}

export function buildPipelineGraph(state: PipelineState): {
  nodes: Node[];
  edges: Edge[];
} {
  const nodes: Node[] = [];
  const edges: Edge[] = [];
  const visibleEtapas = getVisibleEtapas(state);

  // Track last node of previous etapa for cross-etapa edges
  let prevEtapaLastNodeId: string | null = null;
  let visibleEtapaIndex = 0;

  for (const etapaId of state.etapaOrder) {
    if (!visibleEtapas.has(etapaId)) continue;

    const etapaDef = ETAPA_DEFINITIONS.find((e) => e.id === etapaId);
    if (!etapaDef) continue;

    const y = visibleEtapaIndex * ETAPA_GAP_Y + 40;
    visibleEtapaIndex++;

    // Get nodes belonging to this etapa, preserving definition order
    const etapaNodes = etapaDef.nodes
      .map((template) => {
        const nodeId = `${etapaId}-${template.type}`;
        return state.nodes[nodeId];
      })
      .filter(Boolean);

    let firstNodeIdInEtapa: string | null = null;
    let lastNodeIdInEtapa: string | null = null;

    for (let nodeIndex = 0; nodeIndex < etapaNodes.length; nodeIndex++) {
      const pNode = etapaNodes[nodeIndex];
      const template = etapaDef.nodes.find((t) => t.type === pNode.type);

      const nodeId = pNode.id;
      const x = ETAPA_X_START + nodeIndex * (NODE_WIDTH + NODE_GAP_X);

      nodes.push({
        id: nodeId,
        type: "pipeline",
        position: { x, y },
        data: {
          pipelineNodeId: pNode.id,
          etapa: pNode.etapa,
          nodeType: pNode.type,
          label: pNode.label,
          icon: template?.icon ?? "",
          color: etapaDef.color,
          status: pNode.status,
        },
      });

      if (nodeIndex === 0) firstNodeIdInEtapa = nodeId;
      lastNodeIdInEtapa = nodeId;

      // Intra-etapa edge (animated)
      if (nodeIndex > 0) {
        const prevId = etapaNodes[nodeIndex - 1].id;
        edges.push({
          id: `e-${prevId}-${nodeId}`,
          source: prevId,
          target: nodeId,
          animated: true,
        });
      }
    }

    // Cross-etapa dashed edge
    if (prevEtapaLastNodeId && firstNodeIdInEtapa) {
      edges.push({
        id: `e-${prevEtapaLastNodeId}-${firstNodeIdInEtapa}`,
        source: prevEtapaLastNodeId,
        target: firstNodeIdInEtapa,
        style: { strokeDasharray: "5 5", opacity: 0.5 },
      });
    }

    if (lastNodeIdInEtapa) {
      prevEtapaLastNodeId = lastNodeIdInEtapa;
    }
  }

  return { nodes, edges };
}
