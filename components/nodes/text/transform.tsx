import { useChat } from "@ai-sdk/react";
import { getIncomers, useReactFlow } from "@xyflow/react";
import { DefaultChatTransport, type FileUIPart } from "ai";
import {
  BrainCircuitIcon,
  CopyIcon,
  SquareIcon,
} from "lucide-react";
import {
  useCallback,
  useEffect,
} from "react";
import ReactMarkdown from "react-markdown";
import { toast } from "sonner";
import {
  Message,
  MessageContent,
  MessageResponse,
} from "@/components/ai-elements/message";
import {
  Source,
  Sources,
  SourcesContent,
  SourcesTrigger,
} from "@/components/ai-elements/sources";
import { NodeLayout } from "@/components/nodes/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { useReasoning } from "@/hooks/use-reasoning";
import { handleError } from "@/lib/error/handle";
import {
  getDescriptionsFromImageNodes,
  getImagesFromImageNodes,
  getTextFromTextNodes,
} from "@/lib/xyflow";
import { useGateway } from "@/providers/gateway/client";
import { ReasoningTunnel } from "@/tunnels/reasoning";
import { ModelSelector } from "../model-selector";
import type { TextNodeProps } from ".";

type TextTransformProps = TextNodeProps & {
  title: string;
};

const getDefaultModel = (models: ReturnType<typeof useGateway>["models"]) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (!defaultModel) {
    return "o3";
  }

  return defaultModel[0];
};

export const TextTransform = ({
  data,
  id,
  type,
  title,
}: TextTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const { models } = useGateway();
  const modelId = data.model ?? getDefaultModel(models);
  const analytics = useAnalytics();
  const [reasoning, setReasoning] = useReasoning();
  const { sendMessage, messages, setMessages, status, stop } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
    }),
    onError: (error) => handleError("Error generating text", error),
    onFinish: ({ message, isError }) => {
      if (isError) {
        handleError("Error generating text", "Please try again later.");
        return;
      }

      updateNodeData(id, {
        generated: {
          text: message.parts.find((part) => part.type === "text")?.text ?? "",
          sources:
            message.parts?.filter((part) => part.type === "source-url") ?? [],
        },
        updatedAt: new Date().toISOString(),
      });

      setReasoning((oldReasoning) => ({
        ...oldReasoning,
        isGenerating: false,
      }));

      toast.success("Text generated successfully");
    },
  });

  const isRunning = status === "submitted" || status === "streaming";

  const handleGenerate = useCallback(async () => {
    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textPrompts = getTextFromTextNodes(incomers);
    const images = getImagesFromImageNodes(incomers);
    const imageDescriptions = getDescriptionsFromImageNodes(incomers);

    if (!(textPrompts.length || data.instructions)) {
      handleError("Error generating text", "No prompts found");
      return;
    }

    const content: string[] = [];

    if (data.instructions) {
      content.push("--- Instructions ---", data.instructions);
    }

    if (textPrompts.length) {
      content.push("--- Text Prompts ---", ...textPrompts);
    }

    if (imageDescriptions.length) {
      content.push("--- Image Descriptions ---", ...imageDescriptions);
    }

    analytics.track("canvas", "node", "generate", {
      type,
      promptLength: content.join("\n").length,
      model: modelId,
      instructionsLength: data.instructions?.length ?? 0,
      imageCount: images.length,
    });

    const attachments: FileUIPart[] = [];

    for (const image of images) {
      attachments.push({
        mediaType: image.type,
        url: image.url,
        type: "file",
      });
    }

    setMessages([]);
    await sendMessage(
      {
        text: content.join("\n"),
        files: attachments,
      },
      {
        body: {
          modelId,
        },
      }
    );
  }, [
    sendMessage,
    data.instructions,
    getEdges,
    getNodes,
    id,
    modelId,
    type,
    analytics.track,
    setMessages,
  ]);

  const handleRun = useCallback(() => {
    if (isRunning) {
      stop();
    } else {
      handleGenerate();
    }
  }, [isRunning, stop, handleGenerate]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied to clipboard");
  }, []);

  const nonUserMessages = messages.filter((message) => message.role !== "user");

  useEffect(() => {
    const hasReasoning = messages.some((message) =>
      message.parts.some((part) => part.type === "reasoning")
    );

    if (hasReasoning && !reasoning.isReasoning && status === "streaming") {
      setReasoning({ isReasoning: true, isGenerating: true });
    }
  }, [messages, reasoning, status, setReasoning]);

  const incomers = getIncomers({ id }, getNodes(), getEdges());
  const inputsList = incomers.map((n) => ({
    label:
      n.type === "text"
        ? "Text prompt"
        : n.type === "image"
          ? "Reference image"
          : "Input",
    source: (n.data as Record<string, unknown>)?.title as string || n.type || "",
  }));

  const generatedText = messages.length
    ? messages
        .filter((message) => message.role === "assistant")
        .map(
          (message) =>
            message.parts.find((part) => part.type === "text")?.text ?? ""
        )
        .join("\n")
    : data.generated?.text;

  return (
    <NodeLayout
      data={data}
      id={id}
      title={title}
      subtitle={modelId}
      type={type}
      icon={BrainCircuitIcon}
      iconColor="#a0a0a0"
      modelSelector={
        <ModelSelector
          className="w-full"
          key={id}
          onChange={(value) => updateNodeData(id, { model: value })}
          options={models}
          value={modelId}
        />
      }
      onRun={handleRun}
      running={isRunning}
      showInstructions
      onInstructionsChange={(val) => updateNodeData(id, { instructions: val })}
      inputs={inputsList}
      footer={
        <div className="flex items-center gap-1">
          {generatedText && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => handleCopy(generatedText)}
            >
              <CopyIcon size={12} />
            </Button>
          )}
          {isRunning && (
            <Button size="sm" variant="ghost" onClick={stop}>
              <SquareIcon size={12} />
            </Button>
          )}
          {data.updatedAt && (
            <span className="text-[11px] text-muted-foreground">
              {new Intl.DateTimeFormat("en-US", {
                timeStyle: "short",
              }).format(new Date(data.updatedAt))}
            </span>
          )}
        </div>
      }
    >
      <div className="nowheel h-full max-h-[30rem] flex-1 overflow-auto bg-secondary/30 p-4">
        {status === "submitted" && (
          <div className="flex flex-col gap-2">
            <Skeleton className="h-4 w-60 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-40 animate-pulse rounded-lg" />
            <Skeleton className="h-4 w-50 animate-pulse rounded-lg" />
          </div>
        )}
        {typeof data.generated?.text === "string" &&
        nonUserMessages.length === 0 &&
        status !== "submitted" ? (
          <ReactMarkdown>{data.generated.text}</ReactMarkdown>
        ) : null}
        {!(data.generated?.text || nonUserMessages.length) &&
          status !== "submitted" && (
            <div className="flex aspect-video w-full items-center justify-center">
              <p className="text-xs text-muted-foreground">
                Text will appear here
              </p>
            </div>
          )}
        {Boolean(nonUserMessages.length) &&
          status !== "submitted" &&
          nonUserMessages.map((message) => (
            <Message
              className="p-0 [&>div]:max-w-none"
              from={message.role === "assistant" ? "assistant" : "user"}
              key={message.id}
            >
              <div>
                {Boolean(
                  message.parts.filter((part) => part.type === "source-url")
                    ?.length
                ) && (
                  <Sources>
                    <SourcesTrigger
                      count={
                        message.parts.filter(
                          (part) => part.type === "source-url"
                        ).length
                      }
                    />
                    <SourcesContent>
                      {message.parts
                        .filter((part) => part.type === "source-url")
                        .map(({ url, title: sourceTitle }) => (
                          <Source
                            href={url}
                            key={url ?? ""}
                            title={sourceTitle ?? new URL(url).hostname}
                          />
                        ))}
                    </SourcesContent>
                  </Sources>
                )}
                <MessageContent className="bg-transparent p-0">
                  <MessageResponse>
                    {message.parts.find((part) => part.type === "text")?.text ??
                      ""}
                  </MessageResponse>
                </MessageContent>
              </div>
            </Message>
          ))}
      </div>
      <ReasoningTunnel.In>
        {messages.flatMap((message) =>
          message.parts
            .filter((part) => part.type === "reasoning")
            .flatMap((part) => part.text ?? "")
        )}
      </ReasoningTunnel.In>
    </NodeLayout>
  );
};
