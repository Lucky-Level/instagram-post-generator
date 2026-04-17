import { z } from "zod";

export const TextStyleSchema = z.object({
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
  fontWeight: z.string().optional(),
  fill: z.string().optional(),
  stroke: z.string().optional(),
  strokeWidth: z.number().optional(),
  shadowColor: z.string().optional(),
  shadowBlur: z.number().optional(),
  shadowOffsetX: z.number().optional(),
  shadowOffsetY: z.number().optional(),
  charSpacing: z.number().optional(),
  lineHeight: z.number().optional(),
  opacity: z.number().optional(),
  textAlign: z.enum(["left", "center", "right"]).optional(),
  fontStyle: z.enum(["normal", "italic", "oblique"]).optional(),
});

export const PostDataSchema = z.object({
  headline: z.string().optional().default(""),
  subtitle: z.string().optional(),
  cta: z.string().optional(),
  legenda: z.string().optional(),
  hashtags: z.array(z.string()).optional().default([]),
  imagePrompt: z.string().optional().default(""),
  textStyles: z
    .object({
      headline: TextStyleSchema.optional(),
      subtitle: TextStyleSchema.optional(),
      cta: TextStyleSchema.optional(),
    })
    .optional(),
  logo: z
    .object({
      x: z.number(),
      y: z.number(),
      width: z.number(),
    })
    .optional(),
  type: z.enum(["video"]).optional(),
  action: z.enum(["create", "edit", "compose", "update-text", "update-background", "add-element", "apply-style"]).optional().default("create"),
  target: z.string().optional(),
  avatarId: z.string().optional(),
  compositionPlan: z.object({
    reasoning: z.string(),
    operations: z.array(z.object({
      type: z.string(),
    }).passthrough()),
    textPlacement: z.object({
      headlineZone: z.string(),
      subtitleZone: z.string(),
      ctaZone: z.string(),
      needsOverlayForReadability: z.boolean(),
      overlayColor: z.string().optional(),
      overlayOpacity: z.number().optional(),
    }),
    provider: z.enum(["flux-kontext", "gemini-edit", "gemini-generate", "keep-original"]),
  }).optional(),
  slides: z
    .array(
      z.object({
        imagePrompt: z.string().optional(),
        headline: z.string().optional(),
        subtitle: z.string().optional(),
        cta: z.string().optional(),
      }),
    )
    .optional(),
  pipelineNodeId: z.string().optional(),
  pipelineAction: z.enum(["update", "approve", "reject", "skip"]).optional(),
  nodeData: z.record(z.string(), z.unknown()).optional(),
});

export type PostData = z.infer<typeof PostDataSchema>;
export type TextStyle = z.infer<typeof TextStyleSchema>;
