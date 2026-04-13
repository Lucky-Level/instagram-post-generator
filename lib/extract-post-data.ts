import { generateObject } from "ai";
import { createGroq } from "@ai-sdk/groq";
import { PostDataSchema, type PostData } from "./post-data-schema";

const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

/**
 * Extrai e valida o post-data de um bloco <post-data> gerado pelo Claude.
 * Usa Groq (free tier) para garantir schema compliance — Claude às vezes omite campos.
 */
export async function extractPostData(rawJson: string): Promise<PostData | null> {
  try {
    // Tenta parse direto primeiro (sem custo)
    const parsed = PostDataSchema.safeParse(JSON.parse(rawJson));
    if (parsed.success) return parsed.data;
  } catch {
    // JSON malformado — cai no Groq
  }

  try {
    const { object } = await generateObject({
      model: groq("llama-4-scout-17b-16e-instruct"),
      schema: PostDataSchema,
      prompt: `Extract and complete the post-data JSON. Fix any formatting issues and fill missing required fields with sensible defaults. Raw input:\n${rawJson}`,
    });
    return object;
  } catch {
    return null;
  }
}
