"use client";

import { useChat } from "@ai-sdk/react";
import { useReactFlow } from "@xyflow/react";
import { DefaultChatTransport } from "ai";
import {
  ImagePlusIcon,
  Loader2Icon,
  SendIcon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import Image from "next/image";
import {
  type ChangeEvent,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { generateImageAction } from "@/app/actions/image/create";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { templates, type Template } from "@/lib/templates";
import { uploadFile } from "@/lib/upload";

interface PostData {
  type?: "video";
  legenda: string;
  cta: string;
  hashtags: string[];
  imagePrompt: string;
  slides?: { text: string; imagePrompt: string }[];
}

function parsePostData(text: string): PostData | null {
  const match = text.match(/<post-data>\s*([\s\S]*?)\s*<\/post-data>/);
  if (!match) return null;
  try {
    return JSON.parse(match[1]) as PostData;
  } catch {
    return null;
  }
}

function cleanMessageText(text: string): string {
  return text.replace(/<post-data>[\s\S]*?<\/post-data>/g, "").trim();
}

interface ChatPanelProps {
  fullscreen?: boolean;
}

export const ChatPanel = ({ fullscreen }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploadedImage, setUploadedImage] = useState<{
    url: string;
    file: File;
    base64?: string;
  } | null>(null);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setNodes, setEdges, fitView } = useReactFlow();

  const createPipeline = useCallback(
    async (data: PostData) => {
      setGenerating(true);

      try {
        const isCarousel = data.slides && data.slides.length > 0;
        const slides = isCarousel ? data.slides! : [];

        const fullCaption = [
          data.legenda,
          "",
          data.cta,
          "",
          data.hashtags.map((h) => `#${h}`).join(" "),
        ].join("\n");

        const textNodeId = nanoid();

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newNodes: any[] = [];

        newNodes.push({
          id: textNodeId,
          type: "text" as const,
          data: {
            text: fullCaption,
            content: {
              type: "doc",
              content: [
                {
                  type: "paragraph",
                  content: [{ type: "text", text: fullCaption }],
                },
              ],
            },
          },
          position: { x: 100, y: 150 },
          origin: [0, 0.5] as [number, number],
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newEdges: any[] = [];

        if (isCarousel) {
          toast.info(`Criando carrossel com ${slides.length} slides...`);

          const imageNodeIds: string[] = [];
          for (let i = 0; i < slides.length; i++) {
            const id = nanoid();
            imageNodeIds.push(id);
            newNodes.push({
              id,
              type: "image" as const,
              data: { instructions: slides[i].imagePrompt },
              position: { x: 550 + (i % 2) * 400, y: 50 + Math.floor(i / 2) * 350 },
              origin: [0, 0.5] as [number, number],
            });
            newEdges.push({
              id: nanoid(),
              source: textNodeId,
              target: id,
              type: "animated",
            });
          }

          setNodes((nds) => [...nds, ...newNodes]);
          setEdges((eds) => [...eds, ...newEdges]);
          setTimeout(() => fitView({ padding: 0.2 }), 300);

          // Generate images sequentially to avoid rate limits
          let carouselSuccess = 0;
          for (let i = 0; i < slides.length; i++) {
            toast.info(`Gerando imagem ${i + 1}/${slides.length}...`);

            const result = await generateImageAction({
              prompt: slides[i].imagePrompt,
              modelId: "gemini",
              referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            });

            if (!("error" in result)) {
              const nodeId = imageNodeIds[i];
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === nodeId
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          generated: { url: result.url, type: result.type },
                          description: result.description,
                          updatedAt: new Date().toISOString(),
                        },
                      }
                    : n,
                ),
              );
              carouselSuccess++;
            } else {
              console.log(`Slide ${i + 1} failed:`, result.error);
            }

            // Small delay between requests to avoid rate limiting
            if (i < slides.length - 1) {
              await new Promise((r) => setTimeout(r, 2000));
            }
          }

          toast.success(`Carrossel criado! ${carouselSuccess}/${slides.length} imagens geradas.`);
        } else {
          const isVideo = data.type === "video";
          toast.info(isVideo ? "Criando vídeo no canvas..." : "Criando post no canvas...");

          const mediaNodeId = nanoid();
          newNodes.push({
            id: mediaNodeId,
            type: isVideo ? ("video" as const) : ("image" as const),
            data: { instructions: data.imagePrompt },
            position: { x: 550, y: 150 },
            origin: [0, 0.5] as [number, number],
          });
          newEdges.push({
            id: nanoid(),
            source: textNodeId,
            target: mediaNodeId,
            type: "animated",
          });

          setNodes((nds) => [...nds, ...newNodes]);
          setEdges((eds) => [...eds, ...newEdges]);
          setTimeout(() => fitView({ padding: 0.3 }), 300);

          if (!isVideo) {
            toast.info("Gerando imagem com FLUX...");

            const imageResult = await generateImageAction({
              prompt: data.imagePrompt,
              modelId: "gemini",
              referenceImages: referenceImages.length > 0 ? referenceImages : undefined,
            });

            if ("error" in imageResult) {
              toast.error(`Erro na imagem: ${imageResult.error}`);
            } else {
              setNodes((nds) =>
                nds.map((n) =>
                  n.id === mediaNodeId
                    ? {
                        ...n,
                        data: {
                          ...n.data,
                          generated: { url: imageResult.url, type: imageResult.type },
                          description: imageResult.description,
                          updatedAt: new Date().toISOString(),
                        },
                      }
                    : n,
                ),
              );
              toast.success("Post criado no canvas!");
            }
          } else {
            toast.success("Node de vídeo criado! Clique Generate no node para gerar o vídeo.");
          }
        }
      } catch {
        toast.error("Erro ao criar pipeline");
      } finally {
        setGenerating(false);
      }
    },
    [setNodes, setEdges, fitView, referenceImages],
  );

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar resposta");
    },
    onFinish: async ({ message }) => {
      const fullText =
        message.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "";

      const postData = parsePostData(fullText);
      if (postData) {
        await createPipeline(postData);
      }
    },
  });

  const isStreaming = status === "streaming" || status === "submitted";

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    if (messages.length > 0) setShowTemplates(false);
  }, [messages.length]);

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setUploadedImage({ url, file });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && !uploadedImage) || isStreaming) return;

    setShowTemplates(false);

    let contextParts: string[] = [input.trim()];

    // 1. Detect URLs in the input and analyze them
    const urlRegex = /https?:\/\/[^\s]+/g;
    const urls = input.match(urlRegex);
    if (urls?.length) {
      for (const url of urls) {
        try {
          toast.info(`Analisando ${new URL(url).hostname}...`);
          const res = await fetch("/api/analyze-url", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ url }),
          });
          if (res.ok) {
            const data = await res.json();
            contextParts.push(
              `\n\n[ANÁLISE DO SITE ${url}]:\n${data.analysis}`,
            );

            // If the site has an OG image, download and add as reference
            if (data.referenceImageUrl) {
              try {
                const imgRes = await fetch(data.referenceImageUrl);
                if (imgRes.ok) {
                  const blob = await imgRes.blob();
                  const reader = new FileReader();
                  const base64 = await new Promise<string>((resolve) => {
                    reader.onload = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                  });
                  setReferenceImages((prev) => [...prev, base64]);
                }
              } catch {
                // Ignore image fetch errors
              }
            }

            toast.success(`Site analisado: ${data.title || url}`);
          }
        } catch {
          // URL analysis failed silently
        }
      }
    }

    // 2. Handle uploaded image
    if (uploadedImage) {
      try {
        toast.info("Analisando imagem de referência...");

        const reader = new FileReader();
        const base64 = await new Promise<string>((resolve) => {
          reader.onload = () => resolve(reader.result as string);
          reader.readAsDataURL(uploadedImage.file);
        });

        setReferenceImages((prev) => [...prev, base64]);

        const res = await fetch("/api/analyze-image", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageUrl: base64 }),
        });

        if (res.ok) {
          const data = await res.json();
          contextParts.push(
            `\n\n[ANÁLISE DA IMAGEM DE REFERÊNCIA]:\n${data.analysis}`,
          );
          toast.success("Imagem de referência salva!");
        }
      } catch {
        toast.error("Erro ao processar imagem");
      }
    }

    sendMessage({ text: contextParts.join("") });
    setInput("");
    setUploadedImage(null);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const handleTemplateClick = (template: Template) => {
    setInput(template.defaultPrompt);
    setShowTemplates(false);
  };

  const w = fullscreen ? "w-full max-w-2xl mx-auto" : "w-80 shrink-0";

  return (
    <div className={`flex h-full flex-col border-r bg-background ${w}`}>
      <div className="flex items-center gap-2 border-b px-4 py-3">
        <div className="size-2 rounded-full bg-green-500" />
        <h2 className="font-semibold text-sm">Post Agent</h2>
      </div>

      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {showTemplates && messages.length === 0 && (
          <div className="space-y-4">
            <div className="text-center text-muted-foreground text-sm pt-4">
              <p className="font-medium text-foreground text-base">
                O que quer criar?
              </p>
              <p className="text-xs mt-1">
                Selecione um template ou escreva sua ideia
              </p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {templates.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleTemplateClick(t)}
                  className="flex flex-col items-start gap-1 rounded-xl border p-3 text-left text-xs hover:bg-secondary transition"
                >
                  <span className="text-lg">{t.icon}</span>
                  <span className="font-medium text-foreground">{t.title}</span>
                  <span className="text-muted-foreground leading-tight">
                    {t.description}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const text =
            msg.parts
              ?.filter((p) => p.type === "text")
              .map((p) => (p as { type: "text"; text: string }).text)
              .join("") ?? "";

          const cleaned = cleanMessageText(text);
          if (!cleaned) return null;

          return (
            <div
              key={msg.id}
              className={`text-sm leading-relaxed ${
                msg.role === "user"
                  ? "bg-secondary rounded-xl px-3 py-2"
                  : "text-foreground"
              }`}
            >
              {cleaned}
            </div>
          );
        })}

        {isStreaming && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2Icon className="size-3 animate-spin" />
            <span>Gerando...</span>
          </div>
        )}

        {generating && (
          <div className="flex items-center gap-2 text-muted-foreground text-xs">
            <Loader2Icon className="size-3 animate-spin" />
            <span>Criando pipeline no canvas...</span>
          </div>
        )}
      </div>

      {uploadedImage && (
        <div className="px-3 pb-2">
          <div className="relative inline-block">
            <Image
              src={uploadedImage.url}
              alt="Referência"
              width={80}
              height={80}
              className="rounded-lg object-cover border"
            />
            <button
              onClick={() => setUploadedImage(null)}
              className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-destructive-foreground flex items-center justify-center"
            >
              <XIcon className="size-3" />
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t p-3 flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleImageUpload}
        />
        <Button
          type="button"
          size="icon"
          variant="ghost"
          onClick={() => fileInputRef.current?.click()}
          className="shrink-0"
          disabled={isStreaming || generating}
        >
          <ImagePlusIcon className="size-4" />
        </Button>
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Descreva o post..."
          className="min-h-10 max-h-32 resize-none text-sm"
          rows={1}
          disabled={isStreaming || generating}
        />
        <Button
          type="submit"
          size="icon"
          disabled={(!input.trim() && !uploadedImage) || isStreaming || generating}
          className="shrink-0"
        >
          <SendIcon className="size-4" />
        </Button>
      </form>
    </div>
  );
};
