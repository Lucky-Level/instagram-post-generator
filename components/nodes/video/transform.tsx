import { getIncomers, useReactFlow } from "@xyflow/react";
import {
  DownloadIcon,
  Loader2Icon,
  VideoIcon,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { generateVideoAction } from "@/app/actions/video/create";
import { NodeLayout } from "@/components/nodes/layout";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useAnalytics } from "@/hooks/use-analytics";
import { download } from "@/lib/download";
import { handleError } from "@/lib/error/handle";
import { getImagesFromImageNodes, getTextFromTextNodes } from "@/lib/xyflow";
import { useGateway } from "@/providers/gateway/client";
import { ModelSelector } from "../model-selector";
import type { VideoNodeProps } from ".";

type VideoTransformProps = VideoNodeProps & {
  title: string;
};

const getDefaultModel = (models: Record<string, { default?: boolean }>) => {
  const defaultModel = Object.entries(models).find(
    ([_, model]) => model.default
  );

  if (defaultModel) {
    return defaultModel[0];
  }

  const firstModel = Object.keys(models)[0];

  if (!firstModel) {
    throw new Error("No video models available");
  }

  return firstModel;
};

export const VideoTransform = ({
  data,
  id,
  type,
  title,
}: VideoTransformProps) => {
  const { updateNodeData, getNodes, getEdges } = useReactFlow();
  const [loading, setLoading] = useState(false);
  const { videoModels } = useGateway();
  const modelId = data.model ?? getDefaultModel(videoModels);
  const analytics = useAnalytics();

  const handleGenerate = async () => {
    if (loading) {
      return;
    }

    try {
      const incomers = getIncomers({ id }, getNodes(), getEdges());
      const textPrompts = getTextFromTextNodes(incomers);
      const images = getImagesFromImageNodes(incomers);

      if (!(textPrompts.length || images.length)) {
        throw new Error("No prompts found");
      }

      setLoading(true);

      analytics.track("canvas", "node", "generate", {
        type,
        promptLength: textPrompts.join("\n").length,
        model: modelId,
        instructionsLength: data.instructions?.length ?? 0,
      });

      const response = await generateVideoAction({
        modelId,
        prompt: [data.instructions ?? "", ...textPrompts].join("\n"),
        image: images.at(0)?.url,
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
      });

      toast.success("Video generated successfully");
    } catch (error) {
      handleError("Error generating video", error);
    } finally {
      setLoading(false);
    }
  };

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
      icon={VideoIcon}
      iconColor="#878792"
      modelSelector={
        <ModelSelector
          className="w-full"
          key={id}
          onChange={(value) => updateNodeData(id, { model: value })}
          options={videoModels}
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
              onClick={() => download(data.generated, id, "mp4")}
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
        <Skeleton className="flex aspect-video w-full animate-pulse items-center justify-center">
          <Loader2Icon
            className="size-4 animate-spin text-muted-foreground"
            size={16}
          />
        </Skeleton>
      ) : null}
      {!(loading || data.generated?.url) && (
        <div className="flex aspect-video w-full items-center justify-center bg-secondary/30">
          <p className="text-xs text-muted-foreground">
            Video will appear here
          </p>
        </div>
      )}
      {typeof data.generated?.url === "string" && !loading ? (
        <video
          autoPlay
          className="w-full object-cover"
          height={data.height ?? 450}
          loop
          muted
          playsInline
          src={data.generated.url}
          width={data.width ?? 800}
        />
      ) : null}
    </NodeLayout>
  );
};
