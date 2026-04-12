import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { convertToModelMessages, streamText } from "ai";
import { createServerClient } from "@/lib/supabase";

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `Você é o Post Agent — um diretor criativo de agência premium.

## COMO INTERAGIR

Você é conversacional e direto. Não despeje blocos de texto técnico. Faça perguntas curtas, uma de cada vez, para entender o que o usuário quer.

### Fluxo de conversa:

1. **Entenda o pedido** — Quando o usuário pedir algo, responda de forma curta e faça UMA pergunta por vez:
   - "Qual é a marca/produto?"
   - "Qual o objetivo? Vender, engajar, informar?"
   - "Tem preferência de estilo visual?"
   - "Quer incluir algum texto na imagem?"

2. **Confirme antes de criar** — Quando tiver contexto suficiente, resuma em 2-3 linhas o que vai fazer e pergunte: "Posso criar?"

3. **Gere apenas quando aprovado** — Só inclua o bloco <post-data> quando o usuário confirmar.

### Regras de interação:
- Respostas CURTAS (2-4 linhas no máximo por mensagem)
- UMA pergunta por vez, não faça 5 perguntas de uma vez
- Use tom profissional mas amigável
- Se o usuário já deu bastante contexto (marca, produto, objetivo), pule direto para a confirmação
- Se o usuário enviou URL de site, use os dados extraídos e pergunte apenas o que falta
- Se o usuário enviou imagem de referência, reconheça e pergunte o que quer fazer com ela

## QUANDO GERAR

Quando o usuário aprovar, gere o bloco JSON no final da resposta.

O imagePrompt DEVE ser técnico e detalhado (200-400 palavras em inglês):
- ESTILO: "Isometric 3D illustration", "Editorial photography", "Cinematic shot", etc.
- COMPOSIÇÃO: ângulo, perspectiva, focal point
- ILUMINAÇÃO: tipo, direção, temperatura
- PALETA: cores hex da marca
- ELEMENTOS: cada objeto
- MOOD: atmosfera
- QUALIDADE: "high detail, smooth surfaces, professional rendering"

Se o usuário forneceu logo/imagens da marca, inclua: "Preserve the exact brand logo, colors, and visual identity as provided in the reference images."

## FORMATO DO JSON

<post-data>
{
  "legenda": "hook forte + corpo + fechamento (2-4 linhas)",
  "cta": "call to action direto",
  "hashtags": ["3-5 hashtags estratégicas"],
  "imagePrompt": "prompt técnico de 200-400 palavras em inglês"
}
</post-data>

Para CARROSSEL: adicione "slides" com prompts individuais.
Para VÍDEO: adicione "type": "video".

## EDIÇÃO DE IMAGEM

Quando o usuário enviar uma imagem e pedir para EDITAR (remover fundo, mudar algo, criar banner COM a foto):

1. NÃO gere um post novo do zero
2. Adicione "action": "edit" no JSON
3. O imagePrompt deve ser uma INSTRUÇÃO DE EDIÇÃO

<post-data>
{
  "action": "edit",
  "legenda": "legenda do post",
  "cta": "call to action",
  "hashtags": ["hashtags"],
  "imagePrompt": "INSTRUÇÃO DE EDIÇÃO em inglês"
}
</post-data>

REGRA DE OURO: Se mandou foto e quer usar ELA, use "action": "edit". Se quer algo novo inspirado na foto, use o fluxo normal.

## EXEMPLOS DE CONVERSA BOA

Usuário: "cria um post pro meu restaurante"
Agente: "Qual o nome do restaurante e o estilo da comida?"

Usuário: "Pizzaria Bella, pizza artesanal"
Agente: "Qual o objetivo do post? Divulgar o cardápio, uma promoção, ou engajamento geral?"

Usuário: "promoção de terça-feira"
Agente: "Entendi! Vou criar um post para a promoção de terça da Pizzaria Bella com visual premium de pizza artesanal. Posso criar?"

Usuário: "sim"
Agente: [gera o <post-data>]`;

async function buildSystemPrompt(agentId?: string): Promise<string> {
  if (!agentId) return BASE_SYSTEM_PROMPT;

  try {
    const db = createServerClient();
    const { data: agent } = await db
      .from("brand_agents")
      .select("name, personality, brand_kit, platform_rules")
      .eq("id", agentId)
      .single();

    if (!agent) return BASE_SYSTEM_PROMPT;

    const p = agent.personality || {};
    const bk = agent.brand_kit || {};
    const colors = bk.colors || {};
    const fonts = bk.fonts || {};

    let brandContext = `

## BRAND DNA — ${agent.name}

Você é o Creative Director da marca "${agent.name}". TODA criação deve seguir esta identidade:

### Personalidade
- Tom: ${p.tone || "profissional"}
- Energia: ${p.energy || "equilibrada"}
- Público-alvo: ${p.audience || "geral"}
- Linguagem visual: ${p.visual_language || "moderna e limpa"}

### Identidade Visual
- Cor primária: ${colors.primary || "#000000"}
- Cor secundária: ${colors.secondary || "#FFFFFF"}
- Cor de destaque: ${colors.accent || "#3B82F6"}
- Fonte de título: ${fonts.heading || "Inter"}
- Fonte de corpo: ${fonts.body || "Inter"}

### Regras
${p.do_this?.length ? `- SEMPRE: ${p.do_this.join(", ")}` : ""}
${p.never_do_this?.length ? `- NUNCA: ${p.never_do_this.join(", ")}` : ""}

### Instrução
- Use as cores da marca nos imagePrompts (inclua os hex codes)
- Mantenha o tom "${p.tone || "profissional"}" em todas as legendas
- Adapte a linguagem visual ao público: ${p.audience || "geral"}
`;

    // Load brand memory (feedback + learned rules)
    const { data: memories } = await db
      .from("brand_memory")
      .select("type, content, weight")
      .eq("agent_id", agentId)
      .order("weight", { ascending: false })
      .limit(10);

    if (memories?.length) {
      brandContext += `\n\n## LEARNED PREFERENCES\n`;
      const positives = memories.filter((m) => m.weight > 0);
      const negatives = memories.filter((m) => m.weight < 0);
      if (positives.length) {
        brandContext += `User LIKES:\n`;
        for (const m of positives) {
          const content = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
          brandContext += `- ${content.comment || "Approved this style"}\n`;
        }
      }
      if (negatives.length) {
        brandContext += `User DISLIKES:\n`;
        for (const m of negatives) {
          const content = typeof m.content === "string" ? JSON.parse(m.content) : m.content;
          brandContext += `- ${content.comment || "Rejected this style"}\n`;
        }
      }
    }

    // Fetch recent references for brand context
    const { data: refs } = await db
      .from("brand_references")
      .select("analysis, extracted_colors, extracted_layout")
      .eq("agent_id", agentId)
      .order("created_at", { ascending: false })
      .limit(5);

    if (refs?.length) {
      // Add reference context to the brand DNA section
      brandContext += `\n\n## VISUAL REFERENCES\n`;
      for (const ref of refs) {
        if (ref.analysis) brandContext += `- ${ref.analysis}\n`;
        if (ref.extracted_colors) brandContext += `  Colors: ${JSON.stringify(ref.extracted_colors)}\n`;
        if (ref.extracted_layout) brandContext += `  Layout: ${ref.extracted_layout}\n`;
      }
    }

    return BASE_SYSTEM_PROMPT + brandContext;
  } catch {
    return BASE_SYSTEM_PROMPT;
  }
}

export const POST = async (req: Request) => {
  const { messages } = await req.json();
  const agentId = req.headers.get("x-agent-id") || undefined;

  const modelMessages = await convertToModelMessages(messages);

  // Filter out image/file parts — text-only LLM
  const textOnlyMessages = modelMessages.map((msg) => {
    if (Array.isArray(msg.content)) {
      return {
        ...msg,
        content: (msg.content as { type: string }[]).filter(
          (part) => part.type === "text",
        ),
      };
    }
    return msg;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any;

  // Use Gemini if available, fallback to Groq
  const model = process.env.GOOGLE_GENERATIVE_AI_API_KEY
    ? google("gemini-2.5-flash")
    : groq("llama-3.3-70b-versatile");

  const systemPrompt = await buildSystemPrompt(agentId);

  const result = streamText({
    model,
    system: systemPrompt,
    messages: textOnlyMessages,
  });

  return result.toUIMessageStreamResponse({
    sendReasoning: false,
    sendSources: false,
  });
};
