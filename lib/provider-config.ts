import { atom } from "jotai";
import { atomWithStorage } from "jotai/utils";

export type ImageProvider = "auto" | "nano-banana" | "flux-kontext" | "cloudflare" | "pollinations";

export interface ProviderConfig {
  preferredProvider: ImageProvider;
  apiKeys: {
    google?: string;       // Gemini / Nano Banana
    replicate?: string;    // FLUX Kontext Pro
    fal?: string;          // fal.ai (PuLID, FLUX.2)
  };
  quality: "draft" | "final";
  numOptions: number;      // how many image options to generate (1-4)
}

const DEFAULT_CONFIG: ProviderConfig = {
  preferredProvider: "auto",
  apiKeys: {},
  quality: "draft",
  numOptions: 1,
};

export const providerConfigAtom = atomWithStorage<ProviderConfig>(
  "post-agent-provider-config",
  DEFAULT_CONFIG,
);

export const hasCustomKeysAtom = atom((get) => {
  const config = get(providerConfigAtom);
  return Object.values(config.apiKeys).some((k) => k && k.length > 0);
});
