import { z } from "zod";

// --- Bounding box: [y0, x0, y1, x1] normalized 0-1000 ---
const BoundingBoxSchema = z.tuple([
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
  z.number().min(0).max(1000),
]);

// --- Image Analysis (output from Gemini Vision) ---

export const SubjectSchema = z.object({
  type: z.enum(["person", "product", "food", "animal", "abstract", "scene"]),
  boundingBox: BoundingBoxSchema,
  description: z.string(),
  needsBackgroundRemoval: z.boolean(),
});

export const BackgroundSchema = z.object({
  complexity: z.enum(["simple", "moderate", "busy"]),
  dominantColor: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  description: z.string(),
});

export const LightingSchema = z.object({
  direction: z.enum(["left", "right", "top", "even", "dramatic"]),
  brightness: z.enum(["dark", "medium", "bright"]),
  temperature: z.enum(["warm", "neutral", "cool"]),
});

export const TextSafeZoneSchema = z.object({
  region: z.enum(["top", "bottom", "left", "right", "center"]),
  luminance: z.enum(["dark", "medium", "light"]),
});

export const ImageAnalysisSchema = z.object({
  subject: SubjectSchema,
  background: BackgroundSchema,
  lighting: LightingSchema,
  textSafeZones: z.array(TextSafeZoneSchema),
  dominantColors: z.array(z.string().regex(/^#[0-9a-fA-F]{6}$/)),
});

// --- Composition Operations (discriminated union) ---

const RemoveBackgroundOp = z.object({
  type: z.literal("remove-background"),
  reason: z.string(),
});

const ReplaceCharacterOp = z.object({
  type: z.literal("replace-character"),
  description: z.string(),
  preservePose: z.boolean(),
  preserveClothing: z.boolean(),
});

const RemoveObjectOp = z.object({
  type: z.literal("remove-object"),
  description: z.string(),
  region: BoundingBoxSchema,
});

const ColorAdjustOp = z.object({
  type: z.literal("color-adjust"),
  brightness: z.number().min(-100).max(100).default(0),
  contrast: z.number().min(-100).max(100).default(0),
  saturation: z.number().min(-100).max(100).default(0),
  temperature: z.number().min(-50).max(50).default(0),
  reason: z.string(),
});

const AddOverlayOp = z.object({
  type: z.literal("add-overlay"),
  color: z.string(),
  opacity: z.number().min(0).max(1),
  region: z.enum(["full", "top-half", "bottom-half", "left-half", "right-half"]),
  gradient: z.boolean(),
  reason: z.string(),
});

const CropReframeOp = z.object({
  type: z.literal("crop-reframe"),
  focus: z.enum([
    "subject-center",
    "rule-of-thirds-left",
    "rule-of-thirds-right",
    "top-weighted",
    "bottom-weighted",
  ]),
  reason: z.string(),
});

export const CompositionOperationSchema = z.discriminatedUnion("type", [
  RemoveBackgroundOp,
  ReplaceCharacterOp,
  RemoveObjectOp,
  ColorAdjustOp,
  AddOverlayOp,
  CropReframeOp,
]);

// --- Text Placement ---

const TextZone = z.enum(["top", "bottom", "left", "right", "center"]);

export const TextPlacementSchema = z.object({
  headlineZone: TextZone,
  subtitleZone: TextZone,
  ctaZone: TextZone,
  needsOverlayForReadability: z.boolean(),
  overlayColor: z.string().optional(),
  overlayOpacity: z.number().min(0).max(1).optional(),
});

// --- Composition Plan (full plan) ---

export const CompositionPlanSchema = z.object({
  reasoning: z.string(),
  operations: z.array(CompositionOperationSchema),
  textPlacement: TextPlacementSchema,
  imagePrompt: z.string().optional(),
  provider: z.enum([
    "flux-kontext",
    "gemini-edit",
    "gemini-generate",
    "keep-original",
  ]),
});

// --- Exported TypeScript types ---

export type ImageAnalysis = z.infer<typeof ImageAnalysisSchema>;
export type Subject = z.infer<typeof SubjectSchema>;
export type Background = z.infer<typeof BackgroundSchema>;
export type Lighting = z.infer<typeof LightingSchema>;
export type TextSafeZone = z.infer<typeof TextSafeZoneSchema>;
export type CompositionOperation = z.infer<typeof CompositionOperationSchema>;
export type TextPlacement = z.infer<typeof TextPlacementSchema>;
export type CompositionPlan = z.infer<typeof CompositionPlanSchema>;
