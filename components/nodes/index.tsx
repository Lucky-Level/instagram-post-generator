import { DropNode } from "./drop";
import { ImageNode } from "./image";
import { PipelineNode } from "./pipeline";
import { TextNode } from "./text";
import { VideoNode } from "./video";

export const nodeTypes = {
  image: ImageNode,
  text: TextNode,
  drop: DropNode,
  video: VideoNode,
  pipeline: PipelineNode,
};
