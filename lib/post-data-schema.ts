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
  headline: z.string(),
  subtitle: z.string().optional(),
  cta: z.string().optional(),
  legenda: z.string().optional(),
  hashtags: z.array(z.string()).optional().default([]),
  imagePrompt: z.string(),
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
  action: z.enum(["edit"]).optional(),
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
});

export type PostData = z.infer<typeof PostDataSchema>;
export type TextStyle = z.infer<typeof TextStyleSchema>;
