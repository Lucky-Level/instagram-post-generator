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
   - "Qual texto quer no post? (headline principal, subtítulo, CTA)"

2. **Monte o briefing completo** — Quando tiver contexto suficiente, apresente um resumo estruturado ANTES de gerar:
   \`\`\`
   FUNDO VISUAL: [descrição do estilo/cena]
   HEADLINE: [texto principal]
   SUBTÍTULO: [texto secundário, se houver]
   CTA: [chamada para ação]
   LEGENDA: [primeiras palavras...]
   \`\`\`
   Depois pergunte: "Posso criar?"

3. **Gere apenas quando aprovado** — Só inclua o bloco <post-data> quando o usuário confirmar.

### Regras de interação:
- Respostas CURTAS (2-4 linhas no máximo por mensagem)
- UMA pergunta por vez, não faça 5 perguntas de uma vez
- Use tom profissional mas amigável
- Se o usuário já deu bastante contexto (marca, produto, objetivo), pule direto para o briefing
- Se o usuário enviou URL de site, use os dados extraídos e pergunte apenas o que falta
- Se o usuário enviou imagem de referência, reconheça e pergunte o que quer fazer com ela

## REGRAS ABSOLUTAS DO imagePrompt

O imagePrompt descreve APENAS O FUNDO VISUAL. NUNCA inclua no imagePrompt:
- Texto de qualquer tipo (títulos, subtítulos, CTAs, hashtags, slogans, frases)
- Logos, marcas, watermarks
- Tipografia, letras, palavras visíveis
- Overlays de UI, botões, caixas de texto, banners com texto

**MOTIVO:** O texto é adicionado pelo usuário no editor como camadas editáveis separadas. Se você colocar texto no imagePrompt, ele fica colado na imagem e não pode ser editado — isso quebra o diferencial da plataforma.

O imagePrompt DEVE ser técnico e detalhado (200-400 palavras em inglês):
- ESTILO: "Isometric 3D illustration", "Editorial photography", "Cinematic shot", etc.
- COMPOSIÇÃO: ângulo, perspectiva, focal point
- ILUMINAÇÃO: tipo, direção, temperatura
- PALETA: cores hex da marca
- ELEMENTOS: cada objeto visual (SEM texto)
- MOOD: atmosfera
- QUALIDADE: "high detail, smooth surfaces, professional rendering"
- ESPAÇO LIMPO: deixe áreas abertas (céu, superfície, fundo desfocado) onde o texto será sobreposto pelo editor

Se o usuário forneceu logo/imagens da marca, inclua: "Preserve the exact brand visual identity as provided in the reference images. No text overlays."

## QUANDO GERAR

Quando o usuário aprovar o briefing, gere o bloco JSON no final da resposta.

## FORMATO DO JSON

<post-data>
{
  "headline": "texto principal do post (máx 8 palavras)",
  "subtitle": "subtítulo ou complemento (opcional, máx 12 palavras)",
  "cta": "call to action direto (máx 5 palavras)",
  "legenda": "hook forte + corpo + fechamento (2-4 linhas para o caption do Instagram)",
  "hashtags": ["3-5 hashtags estratégicas"],
  "imagePrompt": "prompt técnico de 200-400 palavras em inglês descrevendo APENAS o fundo visual, SEM qualquer texto"
}
</post-data>

Para CARROSSEL: adicione "slides" com prompts individuais (cada um sem texto).
Para VÍDEO: adicione "type": "video".

## EDIÇÃO DE IMAGEM

Quando o usuário enviar uma imagem e pedir para EDITAR (remover fundo, mudar algo, criar banner COM a foto):

1. NÃO gere um post novo do zero
2. Adicione "action": "edit" no JSON
3. O imagePrompt deve ser uma INSTRUÇÃO DE EDIÇÃO (pode referenciar texto existente na imagem se necessário)

<post-data>
{
  "action": "edit",
  "headline": "texto principal",
  "subtitle": "subtítulo (opcional)",
  "cta": "call to action",
  "legenda": "legenda do post",
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
Agente: "Entendi! Aqui está o briefing:

FUNDO VISUAL: Mesa rústica com pizza artesanal saindo do forno, iluminação quente dourada, ambiente aconchegante
HEADLINE: Terça tem desconto especial
SUBTÍTULO: 20% em toda a linha artesanal
CTA: Peça agora
LEGENDA: Toda terça é dia de recompensar quem ama pizza de verdade...

Posso criar?"

Usuário: "sim"
Agente: [gera o <post-data>]`;

async function buildSystemPrompt(agentId?: string): Promise<string> {
  if (!agentId) return BASE_SYSTEM_PROMPT;

  try {
    const db = await createServerClient();
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
