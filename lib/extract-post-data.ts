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
      prompt: `Extrai e completa o post-data JSON abaixo. Corrija formatação e preencha campos obrigatórios faltando com valores padrão em PORTUGUÊS BRASILEIRO. NÃO traduza os textos existentes. Entrada:\n${rawJson}`,
    });
    return object;
  } catch (err) {
    console.error("[extractPostData] Groq fallback failed:", err);
    return null;
  }
}
