# Pletor Node Redesign — Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform the instagram-post-generator canvas into a Pletor-style visual workflow builder with structured nodes, vertical sidebar, zoom controls, task progress, and auto-scroll.

**Architecture:** Redesign NodeLayout as the single source of truth for all node rendering. Use Jotai atoms for shared canvas state (tool mode). Chat panel drives pipeline creation with step-by-step progress tracking.

**Tech Stack:** Next.js 16, React 19, @xyflow/react, Jotai, Lucide React, Tailwind CSS 4

---

## Status: IMPLEMENTED (2026-04-11)

All 6 items implemented and build passes clean.

### What was built:

1. **Pletor-style node layout** (`components/nodes/layout.tsx`)
   - Header with colored Lucide icon + title + subtitle
   - Inline model selector section
   - Instructions textarea section
   - Inputs list showing connected nodes
   - Content area (image/text/video)
   - Footer with Run button (Play icon + "Run" / "Running..." states)
   - Replaced floating toolbar with internal sections

2. **Vertical sidebar** (`components/toolbar.tsx`)
   - Position: top-left panel
   - Orange + button with dropdown menu for node types
   - Disabled buttons: Assets, Templates, Learn, Chat/AI (coming soon)

3. **Canvas controls** (`components/controls.tsx`)
   - Select/Pan tool toggle (wired to ReactFlow via Jotai `canvasToolAtom`)
   - Zoom out/in buttons
   - Live zoom percentage display (clickable for fit-view)

4. **Task Progress** (`components/chat-panel.tsx`)
   - Collapsible step panel during pipeline creation
   - Per-step status: done (green check), in-progress (pulsing orange), pending (gray circle), error (red X)
   - Step counter and auto-clear after 3 seconds

5. **Enhanced pipeline nodes** (`components/chat-panel.tsx`)
   - Carousel: Brand Brief → Slide 1..N + Legenda+Hashtags
   - Single post: Brand Brief → Image/Video + Legenda

6. **Canvas auto-scroll** (`components/chat-panel.tsx`)
   - Smooth scroll to each node during creation
   - Final fitView with animation

### Files changed:
- `lib/canvas-tool.ts` (NEW) — Jotai atom for tool mode
- `components/nodes/layout.tsx` — Complete rewrite
- `components/ai-elements/node.tsx` — Updated border-radius and defaults
- `components/nodes/image/transform.tsx` — New Pletor props
- `components/nodes/text/transform.tsx` — New Pletor props
- `components/nodes/video/transform.tsx` — New Pletor props (if exists)
- `components/nodes/image/primitive.tsx` — Icon + color
- `components/nodes/text/primitive.tsx` — Icon + color
- `components/nodes/video/primitive.tsx` — Icon + color
- `components/toolbar.tsx` — Vertical sidebar rewrite
- `components/controls.tsx` — Zoom + tool controls rewrite
- `components/canvas.tsx` — panOnDrag/selectionOnDrag wired
- `components/chat-panel.tsx` — Progress panel + pipeline + auto-scroll
