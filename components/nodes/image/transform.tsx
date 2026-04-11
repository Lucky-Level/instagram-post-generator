import { getIncomers, useReactFlow } from "@xyflow/react";
import {
  DownloadIcon,
  Loader2Icon,
  SparklesIcon,
} from "lucide-react";
import Image from "next/image";
import { useCallback, useState } from "react";
import { toast } from "sonner";
import { generateImageAction } from "@/app/actions/image/create";
import { editImageAction } from "@/app/actions/image/edit";
import { NodeLayout } from "@/components/nodes/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { download } from "@/lib/download";
import { handleError } from "@/lib/error/handle";
import { getImagesFromImageNodes, getTextFromTextNodes } from "@/lib/xyflow";
import { useGateway } from "@/providers/gateway/client";
import { ModelSelector } from "../model-selector";
import type { ImageNodeProps } from ".";

type ImageTransformProps = ImageNodeProps & {
  title: string;
};

const getDefaultModel = (
  models: Record<string, { default?: boolean }>
): string => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (defaultModel) {
    return defaultModel[0];
  }

  const firstModel = Object.keys(models)[0];

  if (!firstModel) {
    throw new Error("No image models available");
  }

  return firstModel;
};

export const ImageTransform = ({
  data,
  id,
  type,
  title,
}: ImageTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const { imageModels } = useGateway();
  const modelId = data.model ?? getDefaultModel(imageModels);
  const analytics = useAnalytics();

  const availableModels = Object.fromEntries(
    Object.entries(imageModels).map(([key, model]) => [
      key,
      {
        ...model,
        disabled: model.disabled,
      },
    ])
  );

  const handleGenerate = useCallback(async () => {
    if (loading) {
      return;
    }

    const incomers = getIncomers({ id }, getNodes(), getEdges());
    const textNodes = getTextFromTextNodes(incomers);
    const imageNodes = getImagesFromImageNodes(incomers);

    try {
      if (!(textNodes.length || imageNodes.length)) {
        throw new Error("No input provided");
      }

      setLoading(true);

      analytics.track("canvas", "node", "generate", {
        type,
        textPromptsLength: textNodes.length,
        imagePromptsLength: imageNodes.length,
        model: modelId,
        instructionsLength: data.instructions?.length ?? 0,
      });

      const response = imageNodes.length
        ? await editImageAction({
            images: imageNodes,
            instructions: data.instructions,
            modelId,
          })
        : await generateImageAction({
            prompt: textNodes.join("\n"),
            modelId,
            instructions: data.instructions,
          });

      if ("error" in response) {
        throw new Error(response.error);
      }

      updateNodeData(id, {
        updatedAt: new Date().toISOString(),
        generated: {
          url: response.url,
          type: response.type,
        },
        description: response.description,
      });

      toast.success("Image generated successfully");
    } catch (error) {
      handleError("Error generating image", error);
    } finally {
      setLoading(false);
    }
  }, [
    loading,
    id,
    analytics,
    type,
    data.instructions,
    getEdges,
    modelId,
    getNodes,
    updateNodeData,
  ]);

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

  return (
    <NodeLayout
      data={data}
      id={id}
      title={title}
      subtitle={modelId}
      type={type}
      icon={SparklesIcon}
      iconColor="#4a9eff"
      modelSelector={
        <ModelSelector
          className="w-full"
          id={id}
          onChange={(value) => updateNodeData(id, { model: value })}
          options={availableModels}
          value={modelId}
        />
      }
      onRun={handleGenerate}
      running={loading}
      showInstructions
      onInstructionsChange={(val) => updateNodeData(id, { instructions: val })}
      inputs={inputsList}
      footer={
        data.generated?.url ? (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => download(data.generated, id, "png")}
            >
              <DownloadIcon size={12} />
            </Button>
            {data.updatedAt && (
              <span className="text-[11px] text-muted-foreground">
                {new Intl.DateTimeFormat("en-US", {
                  timeStyle: "short",
                }).format(new Date(data.updatedAt))}
              </span>
            )}
          </div>
        ) : undefined
      }
    >
      {loading ? (
        <Skeleton
          className="flex w-full animate-pulse items-center justify-center"
          style={{ aspectRatio: "1/1" }}
        >
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            size={16}
          />
        </Skeleton>
      ) : null}
      {!(loading || data.generated?.url) && (
        <div
          className="flex w-full items-center justify-center bg-secondary/30 p-8"
          style={{ aspectRatio: "1/1" }}
        >
          <p className="text-xs text-muted-foreground">Image will appear here</p>
        </div>
      )}
      {!loading && data.generated?.url && (
        <Image
          alt="Generated image"
          className="w-full object-cover"
          height={1000}
          src={data.generated.url}
          width={1000}
        />
      )}
    </NodeLayout>
  );
};
