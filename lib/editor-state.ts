import { atom } from "jotai";
import type { PostEditorHandle } from "@/components/post-editor";

// Shared handle so sidebar tabs can call editor methods
export const editorHandleAtom = atom<PostEditorHandle | null>(null);

export interface EditorSession {
  imageUrl: string | null; // background image data URL
  headline?: string;
  subtitle?: string;
  cta?: string;
  textStyles?: Record<string, any>;
  logoUrl?: string;
  logoPosition?: { x: number; y: number; width: number };
  canvasWidth: number;
  canvasHeight: number;
  format: string; // "instagram-feed-square", etc.
}

// Whether the editor is open (replaces XYFlow canvas area)
export const editorOpenAtom = atom(false);

// Current editor session data
export const editorSessionAtom = atom<EditorSession>({
  imageUrl: null,
  canvasWidth: 1080,
  canvasHeight: 1080,
  format: "instagram-feed-square",
});

// Active sidebar tab
export type EditorTab =
  | "templates"
  | "text"
  | "images"
  | "shapes"
  | "brand"
  | "layers";
export const editorTabAtom = atom<EditorTab>("templates");
