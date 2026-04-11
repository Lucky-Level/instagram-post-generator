import {
  CameraIcon,
  GalleryHorizontalEndIcon,
  PackageIcon,
  PencilLineIcon,
  PlayCircleIcon,
  MegaphoneIcon,
  SparklesIcon,
  PaletteIcon,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface Template {
  id: string;
  title: string;
  description: string;
  icon: LucideIcon;
  category: "image" | "video" | "carousel" | "edit";
  defaultPrompt: string;
}

export const templates: Template[] = [
  {
    id: "instagram-post",
    title: "Post de Instagram",
    description: "Legenda + CTA + hashtags + imagem",
    icon: CameraIcon,
    category: "image",
    defaultPrompt: "Cria um post de Instagram sobre ",
  },
  {
    id: "carousel",
    title: "Carrossel",
    description: "3-5 slides com imagens e textos",
    icon: GalleryHorizontalEndIcon,
    category: "carousel",
    defaultPrompt: "Cria um carrossel de Instagram com 4 slides sobre ",
  },
  {
    id: "product-shot",
    title: "Product Shot",
    description: "Foto profissional do produto",
    icon: PackageIcon,
    category: "image",
    defaultPrompt: "Gera uma foto profissional de produto para ",
  },
  {
    id: "edit-image",
    title: "Editar Imagem",
    description: "Edite uma imagem com instrução de texto",
    icon: PencilLineIcon,
    category: "edit",
    defaultPrompt: "Edita esta imagem: ",
  },
  {
    id: "animate",
    title: "Animar Imagem",
    description: "Transforma imagem em vídeo 5s",
    icon: PlayCircleIcon,
    category: "video",
    defaultPrompt: "Anima esta imagem com movimento suave e cinematográfico",
  },
  {
    id: "static-ad",
    title: "Static Ad",
    description: "Anúncio estático pronto para publicar",
    icon: MegaphoneIcon,
    category: "image",
    defaultPrompt: "Cria um anúncio estático para ",
  },
  {
    id: "social-creative",
    title: "Social Creative",
    description: "Visual criativo para redes sociais",
    icon: SparklesIcon,
    category: "image",
    defaultPrompt: "Cria um visual criativo para redes sociais sobre ",
  },
  {
    id: "brand-photo",
    title: "On-brand Photo",
    description: "Foto alinhada com a identidade visual",
    icon: PaletteIcon,
    category: "image",
    defaultPrompt: "Gera uma foto on-brand para a marca ",
  },
];
