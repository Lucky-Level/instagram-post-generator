import { atom } from "jotai";

export type CanvasTool = "select" | "pan";

export const canvasToolAtom = atom<CanvasTool>("select");
