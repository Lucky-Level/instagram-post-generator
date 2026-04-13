"use client";

import { useChat } from "@ai-sdk/react";
import { useReactFlow } from "@xyflow/react";
import { DefaultChatTransport } from "ai";
import {
  ArrowUpIcon,
  CheckIcon,
  ChevronDownIcon,
  CircleIcon,
  DownloadIcon,
  Loader2Icon,
  PaperclipIcon,
  PencilIcon,
  ThumbsUpIcon,
  ThumbsDownIcon,
  XCircleIcon,
  XIcon,
} from "lucide-react";
import { nanoid } from "nanoid";
import Image from "next/image";
import {
  type ChangeEvent,
  createElement,
  type FormEvent,
  type KeyboardEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { toast } from "sonner";
import { generateImageAction } from "@/app/actions/image/create";
import { templates, type Template } from "@/lib/templates";
import { cn } from "@/lib/utils";
import { type PlatformFormat, getPlatformFormats, groupByPlatform } from "@/lib/platform-formats";
import { PostEditorModal } from "./post-editor-modal";
import type { ActiveTextProps } from "./post-editor";
import type { PostData } from "@/lib/post-data-schema";
import { useBackgroundRemoval } from "@/hooks/use-background-removal";
import { generateAdScene } from "@/app/actions/image/generate-ad-scene";

interface PipelineStep {
  id: string;
  label: string;
  status: "pending" | "in-progress" | "done" | "error";
}


async function parsePostData(text: string): Promise<PostData | null> {
  const match = text.match(/<post-data>\s*([\s\S]*?)\s*<\/post-data>/);
  if (!match) return null;
  try {
    // Via Groq validation (with fallback to direct parse)
    const parseRes = await fetch("/api/parse-post-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ raw: match[1] }),
    });
    const data = parseRes.ok ? (await parseRes.json() as PostData) : (JSON.parse(match[1]) as PostData);
    return data;
  } catch {
    return null;
  }
}

function cleanMessageText(text: string): string {
  return text.replace(/<post-data>[\s\S]*?<\/post-data>/g, "").trim();
}

// Detect if the agent is asking for confirmation (contains "posso criar" or similar)
function isConfirmationMessage(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes("posso criar") ||
    lower.includes("posso gerar") ||
    lower.includes("quer que eu crie") ||
    lower.includes("quer que eu gere") ||
    lower.includes("vamos criar") ||
    lower.includes("pronto para criar")
  );
}

interface GeneratedImage {
  url: string;
  description?: string;
  platform?: string;
  headline?: string;
  subtitle?: string;
  cta?: string;
  logo?: { x: number; y: number; width: number };
  textStyles?: {
    headline?: Partial<ActiveTextProps>;
    subtitle?: Partial<ActiveTextProps>;
    cta?: Partial<ActiveTextProps>;
  };
}

interface ChatPanelProps {
  fullscreen?: boolean;
  agentId?: string;
}

export const ChatPanel = ({ fullscreen, agentId }: ChatPanelProps) => {
  const [input, setInput] = useState("");
  const [generating, setGenerating] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<{
    url: string;
    file: File;
  }[]>([]);
  const [referenceImages, setReferenceImages] = useState<string[]>([]);
  const referenceImagesRef = useRef<string[]>([]);
  const [showTemplates, setShowTemplates] = useState(true);
  const [runMode, setRunMode] = useState<"manual" | "auto">("auto");
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { setNodes, setEdges, fitView, setCenter } = useReactFlow();
  const { removeBackground } = useBackgroundRemoval();
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>([]);
  const [stepsCollapsed, setStepsCollapsed] = useState(false);
  // Track generated images per assistant message so they render inline in chat
  const [chatImages, setChatImages] = useState<Record<string, GeneratedImage[]>>({});
  const activeMsgIdRef = useRef<string | null>(null);
  const [editorImage, setEditorImage] = useState<{
    msgId: string;
    idx: number;
    url: string;
    headline?: string;
    subtitle?: string;
    cta?: string;
    logo?: { x: number; y: number; width: number };
    textStyles?: GeneratedImage["textStyles"];
  } | null>(null);
  const [selectedFormats, setSelectedFormats] = useState<string[]>(["ig-feed-sq"]);
  const [showPlatforms, setShowPlatforms] = useState(false);
  const [productAdState, setProductAdState] = useState<{
    status: "idle" | "removing-bg" | "generating-scene" | "composing" | "error";
    error: string | null;
  } | null>(null);
  const [productAdImages, setProductAdImages] = useState<Array<{ url: string; description: string }>>([]);

  // Keep steps visible briefly after generation completes, then clear
  useEffect(() => {
    if (!generating) {
      const timer = setTimeout(() => setPipelineSteps([]), 3000);
      return () => clearTimeout(timer);
    }
  }, [generating]);

  const updateStep = useCallback((stepId: string, status: PipelineStep["status"]) => {
    setPipelineSteps((prev) =>
      prev.map((s) => (s.id === stepId ? { ...s, status } : s))
    );
  }, []);

  const scrollToPosition = useCallback(
    (x: number, y: number) => {
      setCenter(x + 200, y, { duration: 800, zoom: 0.8 });
    },
    [setCenter],
  );

  // Keep ref in sync so callbacks always get the latest value
  useEffect(() => {
    referenceImagesRef.current = referenceImages;
  }, [referenceImages]);

  const addChatImage = useCallback((img: GeneratedImage) => {
    const msgId = activeMsgIdRef.current;
    if (!msgId) return;
    setChatImages((prev) => ({
      ...prev,
      [msgId]: [...(prev[msgId] ?? []), img],
    }));
  }, []);

  const composeCreative = useCallback(async (params: {
    backgroundUrl: string;
    headline?: string;
    subtitle?: string;
    cta?: string;
    textStyles?: GeneratedImage["textStyles"];
    logo?: { x: number; y: number; width: number };
    logoUrl?: string;
  }): Promise<string> => {
    const { backgroundUrl, headline, subtitle, cta, textStyles, logo, logoUrl } = params;

    // 1. Renderizar tipografia via Satori
    let typographyPng: string | undefined;
    if (headline || subtitle || cta) {
      try {
        const typoRes = await fetch("/api/render-typography", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ headline, subtitle, cta, textStyles }),
        });
        if (typoRes.ok) {
          const typoData = await typoRes.json();
          typographyPng = typoData.png;
        }
      } catch {
        // Tipografia falhou — continua sem ela
      }
    }

    // 2. Composite via Sharp
    try {
      const composeRes = await fetch("/api/compose-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundUrl,
          typographyPng,
          logoUrl,
          logoPosition: logo,
        }),
      });
      if (composeRes.ok) {
        const composeData = await composeRes.json();
        return composeData.url;
      }
    } catch {
      // Composite falhou — retorna background original
    }

    return backgroundUrl;
  }, []);

  const createProductAd = useCallback(async (sourceFile: File, description: string) => {
    setProductAdState({ status: "removing-bg", error: null });

    // 1. Redimensionar e converter para base64 (max 1024px, para não exceder body limit)
    const originalBase64 = await new Promise<string>((resolve) => {
      const img = new window.Image();
      const objectUrl = URL.createObjectURL(sourceFile);
      img.onload = () => {
        URL.revokeObjectURL(objectUrl);
        const MAX = 1024;
        const scale = Math.min(1, MAX / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(""); return; }
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", 0.85));
      };
      img.onerror = () => { URL.revokeObjectURL(objectUrl); resolve(""); };
      img.src = objectUrl;
    });

    // 2. Remover fundo no browser (WASM)
    toast.info("Removendo fundo do produto...");
    const cutoutUrl = await removeBackground(sourceFile);
    if (!cutoutUrl) {
      setProductAdState({ status: "error", error: "Falha ao remover fundo" });
      toast.error("Falha ao remover fundo");
      return;
    }

    setProductAdState({ status: "generating-scene", error: null });

    // 3. Gerar cena com FLUX Kontext Pro
    toast.info("Gerando cena publicitária...");
    const sceneResult = await generateAdScene({
      productImageUrl: originalBase64,
      productDescription: description,
    });

    if ("error" in sceneResult) {
      setProductAdState({ status: "error", error: sceneResult.error });
      toast.error(`Erro ao gerar cena: ${sceneResult.error}`);
      return;
    }

    setProductAdState({ status: "composing", error: null });

    // 4. Compositar: cena + produto recortado
    toast.info("Compondo criativo final...");
    try {
      const composeRes = await fetch("/api/compose-post", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backgroundUrl: sceneResult.url,
          productLayerUrl: cutoutUrl,
        }),
      });

      if (!composeRes.ok) throw new Error("Falha ao compositar");

      const composeData = await composeRes.json();
      setProductAdImages((prev) => [...prev, { url: composeData.url, description: `Anúncio: ${description}` }]);
      toast.success("Anúncio criado!");
    } catch {
      setProductAdState({ status: "error", error: "Falha ao compositar" });
      toast.error("Falha ao compositar o anúncio");
      return;
    }

    setProductAdState(null);
  }, [removeBackground, setProductAdImages]);

  const createPipeline = useCallback(
    async (data: PostData) => {
      setGenerating(true);
      setStepsCollapsed(false);
      const currentRefs = referenceImagesRef.current;
      console.log(`[Pipeline] Starting with ${currentRefs.length} reference images`);

      try {
        const isCarousel = data.slides && data.slides.length > 0;
        const slides = isCarousel ? data.slides! : [];

        const fullCaption = [
          data.legenda ?? "",
          "",
          data.cta ?? "",
          "",
          data.hashtags.map((h) => `#${h}`).join(" "),
        ].join("\n");

        // Build pipeline steps for the progress panel
        const steps: PipelineStep[] = [];
        steps.push({ id: "text-node", label: "Adicionar no de Legenda", status: "pending" });
        if (isCarousel) {
          for (let i = 0; i < slides.length; i++) {
            steps.push({ id: `slide-${i}`, label: `Gerar imagem slide ${i + 1}`, status: "pending" });
          }
        } else {
          steps.push({
            id: "media-node",
            label: data.type === "video" ? "Adicionar no de Video" : "Gerar imagem",
            status: "pending",
          });
        }
        steps.push({ id: "finalize", label: "Finalizar workflow", status: "pending" });
        setPipelineSteps(steps);

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newNodes: any[] = [];
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const newEdges: any[] = [];

        if (isCarousel) {
          toast.info(`Criando carrossel com ${slides.length} slides...`);

          // Brand Brief node
          const brandBriefId = nanoid();
          newNodes.push({
            id: brandBriefId,
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
            position: { x: 100, y: 200 },
            origin: [0, 0.5] as [number, number],
          });
          updateStep("text-node", "done");

          // Slide image nodes
          const imageNodeIds: string[] = [];
          for (let i = 0; i < slides.length; i++) {
            const slideId = nanoid();
            imageNodeIds.push(slideId);
            newNodes.push({
              id: slideId,
              type: "image" as const,
              data: { instructions: slides[i].imagePrompt ?? "" },
              position: { x: 600, y: 50 + i * 300 },
              origin: [0, 0.5] as [number, number],
            });
            newEdges.push({
              id: nanoid(),
              source: brandBriefId,
              target: slideId,
              type: "animated",
            });
          }

          // Legenda + Hashtags node
          const legendaId = nanoid();
          newNodes.push({
            id: legendaId,
            type: "text" as const,
            data: {
              text: `${data.legenda ?? ""}\n\n${data.cta ?? ""}\n\n${data.hashtags.map((h) => `#${h}`).join(" ")}`,
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Legenda + Hashtags" }],
                  },
                ],
              },
            },
            position: { x: 100, y: 50 + slides.length * 300 },
            origin: [0, 0.5] as [number, number],
          });

          setNodes((nds) => [...nds, ...newNodes]);
          setEdges((eds) => [...eds, ...newEdges]);

          // Scroll to brand brief first
          scrollToPosition(100, 200);
          await new Promise((r) => setTimeout(r, 500));

          if (runMode === "auto") {
            let carouselSuccess = 0;
            for (let i = 0; i < slides.length; i++) {
              updateStep(`slide-${i}`, "in-progress");
              toast.info(`Gerando imagem ${i + 1}/${slides.length}...`);

              // Scroll to the slide being generated
              scrollToPosition(600, 50 + i * 300);

              const refs = referenceImagesRef.current;
              const result = await generateImageAction({
                prompt: slides[i].imagePrompt ?? "",
                modelId: "gemini",
                referenceImages: refs.length > 0 ? refs : undefined,
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
                const composedSlideUrl = await composeCreative({
                  backgroundUrl: result.url,
                  headline: data.headline,
                  subtitle: data.subtitle,
                  cta: data.cta,
                  textStyles: data.textStyles,
                  logo: data.logo,
                  logoUrl: undefined, // TODO: pass logoUrl from brand_kit
                });
                addChatImage({ url: composedSlideUrl, description: result.description, headline: data.headline, subtitle: data.subtitle, cta: data.cta, logo: data.logo, textStyles: data.textStyles });
                carouselSuccess++;
                updateStep(`slide-${i}`, "done");
              } else {
                updateStep(`slide-${i}`, "error");
              }

              if (i < slides.length - 1) {
                await new Promise((r) => setTimeout(r, 2000));
              }
            }
            updateStep("finalize", "done");
            toast.success(`Carrossel criado! ${carouselSuccess}/${slides.length} imagens geradas.`);
          } else {
            updateStep("finalize", "done");
            toast.success("Workflow criado! Clique Run em cada node para gerar.");
          }

          // Fit all nodes at the end
          setTimeout(() => fitView({ padding: 0.2, duration: 800 }), 300);
        } else {
          const isVideo = data.type === "video";
          const brandBriefId = nanoid();

          // Brand Brief node
          newNodes.push({
            id: brandBriefId,
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
          updateStep("text-node", "done");

          // Media node
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
            source: brandBriefId,
            target: mediaNodeId,
            type: "animated",
          });

          // Legenda node
          const legendaId = nanoid();
          newNodes.push({
            id: legendaId,
            type: "text" as const,
            data: {
              text: `${data.legenda ?? ""}\n\n${data.cta ?? ""}\n\n${data.hashtags.map((h) => `#${h}`).join(" ")}`,
              content: {
                type: "doc",
                content: [
                  {
                    type: "paragraph",
                    content: [{ type: "text", text: "Legenda" }],
                  },
                ],
              },
            },
            position: { x: 550, y: 400 },
            origin: [0, 0.5] as [number, number],
          });

          setNodes((nds) => [...nds, ...newNodes]);
          setEdges((eds) => [...eds, ...newEdges]);

          // Scroll to brand brief
          scrollToPosition(100, 150);
          await new Promise((r) => setTimeout(r, 500));

          if (runMode === "auto" && !isVideo) {
            updateStep("media-node", "in-progress");
            toast.info("Construindo workflow...");
            const isEdit = data.action === "edit";
            const refs = referenceImagesRef.current;

            // Scroll to media node
            scrollToPosition(550, 150);

            let imageResult: { url: string; type: string; description: string } | { error: string };

            if (isEdit && refs.length > 0) {
              toast.info("Editando imagem...");
              const editRes = await fetch("/api/edit-image", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  imageBase64: refs[refs.length - 1],
                  action: "edit",
                  prompt: data.imagePrompt,
                }),
              });
              const editData = await editRes.json();
              imageResult = editRes.ok
                ? { url: editData.url, type: editData.type, description: data.imagePrompt }
                : { error: editData.error };
            } else {
              toast.info(refs.length > 0 ? "Gerando com referencias..." : "Gerando imagem...");
              imageResult = await generateImageAction({
                prompt: data.imagePrompt,
                modelId: "gemini",
                referenceImages: refs.length > 0 ? refs : undefined,
              });
            }

            if ("error" in imageResult) {
              toast.error(`Erro na imagem: ${imageResult.error}`);
              updateStep("media-node", "error");
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
              const composedUrl = await composeCreative({
                backgroundUrl: imageResult.url,
                headline: data.headline,
                subtitle: data.subtitle,
                cta: data.cta,
                textStyles: data.textStyles,
                logo: data.logo,
                logoUrl: undefined, // TODO: pass logoUrl from brand_kit
              });
              addChatImage({ url: composedUrl, description: imageResult.description, platform: "Instagram Feed Square", headline: data.headline, subtitle: data.subtitle, cta: data.cta, logo: data.logo, textStyles: data.textStyles });
              updateStep("media-node", "done");

              // Generate variants for other selected platform formats
              const allFormats = getPlatformFormats();
              const extraFormats = selectedFormats
                .filter((fid) => fid !== "ig-feed-sq")
                .map((fid) => allFormats.find((f) => f.id === fid))
                .filter(Boolean) as PlatformFormat[];

              if (extraFormats.length > 0) {
                toast.info(`Gerando ${extraFormats.length} variante(s) de plataforma...`);
                for (const fmt of extraFormats) {
                  try {
                    const composeRes = await fetch("/api/compose", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        imageUrl: imageResult.url,
                        width: fmt.width,
                        height: fmt.height,
                        fit: "cover",
                      }),
                    });
                    if (composeRes.ok) {
                      const composed = await composeRes.json();
                      const composedVariantUrl = await composeCreative({
                        backgroundUrl: composed.url,
                        headline: data.headline,
                        subtitle: data.subtitle,
                        cta: data.cta,
                        textStyles: data.textStyles,
                        logo: data.logo,
                        logoUrl: undefined, // TODO: pass logoUrl from brand_kit
                      });
                      addChatImage({
                        url: composedVariantUrl,
                        description: `${fmt.platform} - ${fmt.format_name} (${fmt.width}x${fmt.height})`,
                        platform: `${fmt.platform} ${fmt.format_name}`,
                        headline: data.headline,
                        subtitle: data.subtitle,
                        cta: data.cta,
                        logo: data.logo,
                        textStyles: data.textStyles,
                      });
                    }
                  } catch {
                    // Variant generation failed silently
                  }
                }
              }

              toast.success("Post criado!");
            }
          } else {
            toast.success("Workflow criado! Clique Run no node para gerar.");
          }

          updateStep("finalize", "done");

          // Fit all nodes at the end
          setTimeout(() => fitView({ padding: 0.3, duration: 800 }), 300);
        }
      } catch {
        toast.error("Erro ao criar pipeline");
      } finally {
        setGenerating(false);
      }
    },
    [setNodes, setEdges, fitView, runMode, updateStep, scrollToPosition, addChatImage, composeCreative],
  );

  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      headers: agentId ? { "x-agent-id": agentId } : undefined,
    }),
    onError: (error) => {
      toast.error(error.message || "Erro ao gerar resposta");
    },
    onFinish: async ({ message }) => {
      const fullText =
        message.parts
          ?.filter((p) => p.type === "text")
          .map((p) => (p as { type: "text"; text: string }).text)
          .join("") ?? "";

      const postData = await parsePostData(fullText);
      if (postData) {
        activeMsgIdRef.current = message.id;
        await createPipeline(postData);
        activeMsgIdRef.current = null;
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
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const newImages = Array.from(files).map((file) => ({
      url: URL.createObjectURL(file),
      file,
    }));
    setUploadedImages((prev) => [...prev, ...newImages]);
    // Reset input so the same file can be selected again
    e.target.value = "";
  };

  const handleQuickReply = (text: string) => {
    sendMessage({ text });
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if ((!input.trim() && uploadedImages.length === 0) || isStreaming) return;

    setShowTemplates(false);

    const contextParts: string[] = [input.trim()];

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
                  referenceImagesRef.current = [...referenceImagesRef.current, base64];
                  setReferenceImages(referenceImagesRef.current);
                }
              } catch {
                // Ignore
              }
            }

            toast.success(`Site analisado: ${data.title || url}`);
          }
        } catch {
          // URL analysis failed silently
        }
      }
    }

    // 2. Handle uploaded images (supports multiple)
    if (uploadedImages.length > 0) {
      toast.info(`Analisando ${uploadedImages.length} imagem(ns) de referencia...`);
      for (const img of uploadedImages) {
        try {
          const reader = new FileReader();
          const base64 = await new Promise<string>((resolve) => {
            reader.onload = () => resolve(reader.result as string);
            reader.readAsDataURL(img.file);
          });

          referenceImagesRef.current = [...referenceImagesRef.current, base64];
          setReferenceImages([...referenceImagesRef.current]);

          const res = await fetch("/api/analyze-image", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ imageUrl: base64 }),
          });

          if (res.ok) {
            const data = await res.json();
            contextParts.push(
              `\n\n[ANÁLISE DA IMAGEM DE REFERÊNCIA ${uploadedImages.indexOf(img) + 1}]:\n${data.analysis}`,
            );
          }

          // Deep reference analysis for brand learning
          try {
            const deepRes = await fetch("/api/analyze-reference", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl: base64 }),
            });
            if (deepRes.ok) {
              const deepData = await deepRes.json();
              contextParts.push(
                `\n\n[ANÁLISE PROFUNDA DE REFERÊNCIA ${uploadedImages.indexOf(img) + 1}]:\nCores: ${deepData.dominantColors?.join(", ")}\nEstilo: ${deepData.visualStyle}\nMood: ${deepData.mood}\nLayout: ${deepData.layoutStructure}\nPosição texto: ${deepData.textPlacement}`,
              );
            }
          } catch {
            // Deep analysis failed silently
          }
        } catch {
          toast.error("Erro ao processar imagem");
        }
      }
      toast.success(`${uploadedImages.length} imagem(ns) de referencia salvas!`);
    }

    sendMessage({ text: contextParts.join("") });
    setInput("");
    setUploadedImages([]);
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

  const w = fullscreen ? "w-full max-w-2xl mx-auto" : "w-80 shrink-0 max-md:w-full";

  // Find the last assistant message to check if it's a confirmation
  const lastAssistantMsg = [...messages].reverse().find((m) => m.role === "assistant");
  const lastAssistantText = lastAssistantMsg
    ? lastAssistantMsg.parts
        ?.filter((p) => p.type === "text")
        .map((p) => (p as { type: "text"; text: string }).text)
        .join("") ?? ""
    : "";
  const showQuickReplies =
    !isStreaming &&
    !generating &&
    lastAssistantText &&
    isConfirmationMessage(lastAssistantText) &&
    !/<post-data>[\s\S]*?<\/post-data>/.test(lastAssistantText);

  return (
    <div className={`flex h-full flex-col border-r border-border bg-background ${w}`}>
      {/* Header — hidden in fullscreen (cleaner look), shown in sidebar */}
      {!fullscreen && (
        <div className="flex items-center justify-between border-b border-border px-4 py-3">
          <div className="flex items-center gap-2">
            <div className="size-2 rounded-full bg-primary" />
            <h2 className="font-medium text-sm">Post Agent</h2>
          </div>
        </div>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-4">
        {showTemplates && messages.length === 0 && (
          <div className={cn("space-y-6", fullscreen && "flex flex-col items-center justify-center min-h-full")}>
            {/* Greeting — Pletor style */}
            <div className={cn("text-center pt-4 pb-2", fullscreen && "pt-0")}>
              <div className="inline-flex items-center gap-2 mb-3">
                <div className="size-8 rounded-full bg-primary/10 flex items-center justify-center">
                  <div className="size-3 rounded-full bg-primary" />
                </div>
              </div>
              <p className={cn(
                "font-normal text-foreground tracking-tight",
                fullscreen ? "text-2xl sm:text-[30px]" : "text-lg"
              )}>
                O que quer criar?
              </p>
              <p className={cn(
                "mt-2 text-muted-foreground",
                fullscreen ? "text-sm" : "text-xs"
              )}>
                Descreva sua ideia ou escolha um template para comecar
              </p>
            </div>

            {/* Template chips — Pletor suggestion style */}
            <div className={cn(
              "w-full space-y-2",
              fullscreen && "max-w-lg"
            )}>
              {templates.slice(0, fullscreen ? 4 : 8).map((t) => (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateClick(t)}
                    className="flex w-full items-center gap-3 rounded-xl border border-border px-4 py-3 text-left text-sm hover:bg-secondary/60 hover:border-primary/20 transition-all group"
                  >
                    <span className="flex size-4 shrink-0 items-center justify-center text-muted-foreground group-hover:text-primary transition-colors">
                      {createElement(t.icon, { size: 16 })}
                    </span>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="font-medium text-foreground text-[13px]">{t.title}</span>
                      <span className="text-muted-foreground text-[11px] leading-tight truncate">
                        {t.description}
                      </span>
                    </div>
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

          const hasPostData = /<post-data>[\s\S]*?<\/post-data>/.test(text);

          return (
            <div key={msg.id} className="space-y-2">
              {msg.role === "user" ? (
                <div className="bg-secondary/60 rounded-2xl px-4 py-2.5 text-sm">
                  {cleaned}
                </div>
              ) : (
                <div className="text-sm leading-relaxed text-foreground">
                  {cleaned}
                </div>
              )}

              {/* Pipeline creation indicator */}
              {hasPostData && msg.role === "assistant" && (
                <div className="flex items-center gap-2 text-xs text-muted-foreground mt-1">
                  <div className="size-1.5 rounded-full bg-primary" />
                  <span>Workflow criado{!fullscreen ? " no canvas" : ""}</span>
                </div>
              )}

              {/* Generated images inline (especially useful in APP/fullscreen mode) */}
              {chatImages[msg.id] && chatImages[msg.id].length > 0 && (
                <div className={cn(
                  "grid gap-2 mt-2",
                  chatImages[msg.id].length === 1 ? "grid-cols-1" : "grid-cols-2"
                )}>
                  {chatImages[msg.id].map((img, idx) => (
                    <div key={idx} className="space-y-0">
                      <div className="group relative rounded-xl overflow-hidden border border-border bg-secondary/30">
                        {img.platform && (
                          <div className="absolute top-2 left-2 z-10 rounded-md bg-black/60 px-2 py-0.5 text-[10px] font-medium text-white backdrop-blur-sm">
                            {img.platform}
                          </div>
                        )}
                        <Image
                          src={img.url}
                          alt={img.description || `Imagem gerada ${idx + 1}`}
                          width={1000}
                          height={1000}
                          className="w-full h-auto object-cover"
                        />
                        {/* Hover overlay with Edit + Download */}
                        <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                          <button
                            onClick={() => setEditorImage({ msgId: msg.id, idx, url: img.url, headline: img.headline, subtitle: img.subtitle, cta: img.cta, logo: img.logo, textStyles: img.textStyles })}
                            className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:bg-white transition-colors"
                            title="Edit image"
                          >
                            <PencilIcon className="size-4" />
                          </button>
                          <button
                            onClick={() => {
                              const link = document.createElement("a");
                              link.download = `post-${idx + 1}.png`;
                              link.href = img.url;
                              link.click();
                            }}
                            className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:bg-white transition-colors"
                            title="Download image"
                          >
                            <DownloadIcon className="size-4" />
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 px-2 py-1">
                        <button
                          onClick={async () => {
                            try {
                              await fetch("/api/feedback", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ imageUrl: img.url, sentiment: "positive", agentId }),
                              });
                              toast.success("Feedback salvo!");
                            } catch { /* silent */ }
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-green-500 transition-colors"
                          title="Gostei"
                        >
                          <ThumbsUpIcon className="size-3" />
                        </button>
                        <button
                          onClick={async () => {
                            try {
                              await fetch("/api/feedback", {
                                method: "POST",
                                headers: { "Content-Type": "application/json" },
                                body: JSON.stringify({ imageUrl: img.url, sentiment: "negative", agentId }),
                              });
                              toast.info("Feedback salvo. Diga o que nao gostou no chat.");
                            } catch { /* silent */ }
                          }}
                          className="p-1 rounded text-muted-foreground hover:text-red-500 transition-colors"
                          title="Nao gostei"
                        >
                          <ThumbsDownIcon className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}

        {/* Quick reply buttons when agent asks for confirmation */}
        {showQuickReplies && (
          <div className="space-y-2 pt-1">
            {/* Platform format picker */}
            <div className="space-y-1.5">
              <button
                onClick={() => setShowPlatforms(!showPlatforms)}
                className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
              >
                <ChevronDownIcon className={cn("size-3 transition-transform", !showPlatforms && "-rotate-90")} />
                <span>Plataformas ({selectedFormats.length})</span>
              </button>
              {showPlatforms && (
                <div className="rounded-lg border border-border bg-card p-2 space-y-2 max-h-48 overflow-y-auto">
                  {Object.entries(groupByPlatform(getPlatformFormats())).map(([platform, formats]) => (
                    <div key={platform}>
                      <p className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider mb-1">
                        {platform}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {formats.map((fmt) => {
                          const selected = selectedFormats.includes(fmt.id);
                          return (
                            <button
                              key={fmt.id}
                              onClick={() => {
                                setSelectedFormats((prev) =>
                                  selected ? prev.filter((id) => id !== fmt.id) : [...prev, fmt.id]
                                );
                              }}
                              className={cn(
                                "rounded-md px-2 py-0.5 text-[10px] border transition-colors",
                                selected
                                  ? "border-primary bg-primary/10 text-primary"
                                  : "border-border text-muted-foreground hover:border-foreground/20"
                              )}
                            >
                              {fmt.format_name}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => handleQuickReply("Sim, cria!")}
                className="px-4 py-2 rounded-full bg-primary text-primary-foreground text-xs font-medium hover:bg-primary/90 transition-colors"
              >
                Let&apos;s go!
              </button>
              <button
                onClick={() => handleQuickReply("Quero ajustar algumas coisas")}
                className="px-4 py-2 rounded-full border border-border text-xs font-medium text-muted-foreground hover:text-foreground hover:border-foreground/20 transition-colors"
              >
                Ajustar
              </button>
            </div>
          </div>
        )}

        {/* Streaming indicator */}
        {isStreaming && (
          <div className="flex items-center gap-2 text-primary text-xs pt-1">
            <div className="flex gap-1">
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
              <span className="size-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
            </div>
          </div>
        )}

        {/* Pipeline progress */}
        {pipelineSteps.length > 0 && (
          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <button
              className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
              onClick={() => setStepsCollapsed(!stepsCollapsed)}
            >
              <div className="flex items-center gap-2">
                <ChevronDownIcon
                  className={cn(
                    "size-3.5 text-muted-foreground transition-transform",
                    stepsCollapsed && "-rotate-90"
                  )}
                />
                <span className="text-sm font-medium">
                  {generating ? "Building workflow..." : "Workflow complete"}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">
                {pipelineSteps.filter((s) => s.status === "done").length}/{pipelineSteps.length}
              </span>
            </button>

            {/* Steps list */}
            {!stepsCollapsed && (
              <div className="border-t border-border px-3 py-2 space-y-1.5">
                {pipelineSteps.map((step) => (
                  <div key={step.id} className="flex items-center gap-2 text-xs">
                    {step.status === "done" && (
                      <CheckIcon className="size-3.5 text-green-500" />
                    )}
                    {step.status === "in-progress" && (
                      <div className="size-3.5 flex items-center justify-center">
                        <div className="size-2 rounded-full bg-primary animate-pulse" />
                      </div>
                    )}
                    {step.status === "pending" && (
                      <CircleIcon className="size-3.5 text-muted-foreground/40" />
                    )}
                    {step.status === "error" && (
                      <XCircleIcon className="size-3.5 text-destructive" />
                    )}
                    <span
                      className={cn(
                        "text-foreground",
                        step.status === "pending" && "text-muted-foreground",
                        step.status === "done" && "text-muted-foreground line-through"
                      )}
                    >
                      {step.label}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Product Ad status overlay */}
      {productAdState && (
        <div className="flex items-center gap-2 text-xs text-muted-foreground px-4 py-2 bg-muted/50 border-t border-border">
          {productAdState.status === "error" ? (
            <>
              <span className="text-destructive">Erro: {productAdState.error}</span>
              <button
                type="button"
                onClick={() => setProductAdState(null)}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                <XIcon className="size-3" />
              </button>
            </>
          ) : (
            <>
              <Loader2Icon className="h-3 w-3 animate-spin shrink-0" />
              <span>
                {productAdState.status === "removing-bg" && "Removendo fundo..."}
                {productAdState.status === "generating-scene" && "Gerando cena com IA..."}
                {productAdState.status === "composing" && "Compondo criativo..."}
              </span>
            </>
          )}
        </div>
      )}

      {/* Product Ad results */}
      {productAdImages.length > 0 && (
        <div className="px-4 pb-2 space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Anúncios gerados</p>
          <div className="grid grid-cols-1 gap-2">
            {productAdImages.map((img, idx) => (
              <div key={idx} className="group relative rounded-xl overflow-hidden border border-border bg-secondary/30">
                <Image
                  src={img.url}
                  alt={img.description}
                  width={400}
                  height={400}
                  className="w-full h-auto object-cover"
                />
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 group-hover:bg-black/40 group-hover:opacity-100 transition-all">
                  <button
                    onClick={() => {
                      const link = document.createElement("a");
                      link.download = `product-ad-${idx + 1}.png`;
                      link.href = img.url;
                      link.click();
                    }}
                    className="flex size-10 items-center justify-center rounded-full bg-white/90 text-black shadow-md hover:bg-white transition-colors"
                    title="Download"
                  >
                    <DownloadIcon className="size-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Uploaded images preview */}
      {uploadedImages.length > 0 && (
        <div className="px-4 pb-2 flex gap-2 flex-wrap">
          {uploadedImages.map((img, idx) => (
            <div key={idx} className="relative inline-block group/img">
              <Image
                src={img.url}
                alt={`Referencia ${idx + 1}`}
                width={64}
                height={64}
                className="rounded-lg object-cover border border-border size-16"
              />
              <button
                onClick={() => setUploadedImages((prev) => prev.filter((_, i) => i !== idx))}
                className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
              >
                <XIcon className="size-3" />
              </button>
              <button
                type="button"
                onClick={() => createProductAd(img.file, input.trim() || "produto")}
                disabled={productAdState !== null && productAdState.status !== "error"}
                className="absolute bottom-0 left-0 right-0 bg-black/80 hover:bg-black text-white text-[9px] font-medium rounded-b-lg px-1 py-0.5 opacity-0 group-hover/img:opacity-100 transition-opacity disabled:cursor-not-allowed"
              >
                Criar anúncio
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Post Editor Modal */}
      {editorImage && (
        <PostEditorModal
          imageUrl={editorImage.url}
          headline={editorImage.headline}
          subtitle={editorImage.subtitle}
          cta={editorImage.cta}
          open={!!editorImage}
          agentId={agentId}
          // TODO: pass brand logo URL (logoUrl comes from brand_kit, not available here yet)
          logoUrl={undefined}
          logoPosition={editorImage.logo}
          textStyles={editorImage.textStyles}
          onClose={() => setEditorImage(null)}
          onSave={(dataUrl) => {
            const { msgId, idx } = editorImage;
            setChatImages((prev) => {
              const imgs = [...(prev[msgId] ?? [])];
              if (imgs[idx]) {
                imgs[idx] = { ...imgs[idx], url: dataUrl };
              }
              return { ...prev, [msgId]: imgs };
            });

            // Gravar estilo aprovado no brand_memory (fire-and-forget)
            if (editorImage.textStyles && agentId) {
              fetch("/api/brand-memory", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  agentId,
                  type: "approved_style",
                  content: JSON.stringify({
                    textStyles: editorImage.textStyles,
                    approvedAt: new Date().toISOString(),
                  }),
                }),
              }).catch(() => {
                // silencioso — nao bloquear o save por falha no memory
              });
            }
          }}
        />
      )}

      {/* Input area — Pletor style */}
      <div className={cn(
        "border-t border-border p-3 space-y-2",
        fullscreen && "px-4 pb-4 sm:pb-6"
      )}>
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleImageUpload}
          />
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Descreva o que quer criar..."
            className={cn(
              "w-full resize-none rounded-xl border border-border bg-secondary/50 px-4 py-3 pr-12 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50",
              fullscreen ? "min-h-[52px] max-h-40" : "min-h-[44px] max-h-32"
            )}
            rows={1}
            disabled={isStreaming || generating}
          />
          <button
            type="submit"
            disabled={(!input.trim() && uploadedImages.length === 0) || isStreaming || generating}
            className={cn(
              "absolute right-2 rounded-lg bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-30 hover:bg-primary/90 transition-colors",
              fullscreen ? "bottom-2.5 size-9" : "bottom-2 size-8"
            )}
          >
            <ArrowUpIcon className="size-4" />
          </button>
        </form>

        {/* Bottom bar: attachment + Manual/Auto toggle */}
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="p-1.5 rounded-md text-muted-foreground hover:text-foreground transition-colors"
            disabled={isStreaming || generating}
          >
            <PaperclipIcon className="size-4" />
          </button>

          <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5 text-[11px]">
            <button
              type="button"
              onClick={() => setRunMode("manual")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                runMode === "manual"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Manual
            </button>
            <button
              type="button"
              onClick={() => setRunMode("auto")}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                runMode === "auto"
                  ? "bg-background text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              Auto
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
