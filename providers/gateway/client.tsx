"use client";

import type { ReactNode } from "react";
import { createContext, useContext } from "react";
import { providers, type TersaModel, type TersaProvider } from "@/lib/providers";

export type PriceBracket = "lowest" | "low" | "high" | "highest";

type TersaTextModel = TersaModel & {
  providers: (TersaProvider & {
    model: string;
    getCost: ({ input, output }: { input: number; output: number }) => number;
  })[];
};

export type TersaImageModel = TersaModel & {
  providers: (TersaProvider & {
    model: string;
    getCost: () => number;
  })[];
};

export type TersaVideoModel = TersaModel & {
  providers: (TersaProvider & {
    model: string;
    getCost: () => number;
  })[];
};

interface GatewayContextType {
  models: Record<string, TersaTextModel>;
  imageModels: Record<string, TersaImageModel>;
  videoModels: Record<string, TersaVideoModel>;
}

const GatewayContext = createContext<GatewayContextType | undefined>(undefined);

export const useGateway = () => {
  const context = useContext(GatewayContext);
  if (!context) {
    throw new Error("useGateway must be used within a GatewayProviderClient");
  }
  return context;
};

const HARDCODED_MODELS: GatewayContextType = {
  models: {
    "groq/llama-3.3-70b-versatile": {
      label: "Llama 3.3 70B",
      chef: providers.groq,
      providers: [
        {
          ...providers.groq,
          model: "groq/llama-3.3-70b-versatile",
          getCost: () => 0,
        },
      ],
      priceIndicator: "lowest" as PriceBracket,
      default: true,
    },
  },
  imageModels: {
    "hf/black-forest-labs/FLUX.1-schnell": {
      label: "FLUX.1 Schnell",
      chef: providers.unknown,
      providers: [
        {
          ...providers.unknown,
          model: "hf/black-forest-labs/FLUX.1-schnell",
          getCost: () => 0,
        },
      ],
      priceIndicator: "lowest" as PriceBracket,
      default: true,
    },
  },
  videoModels: {
    "hf/Wan-AI/Wan2.1-T2V-14B": {
      label: "Wan 2.1 T2V",
      chef: providers.unknown,
      providers: [
        {
          ...providers.unknown,
          model: "hf/Wan-AI/Wan2.1-T2V-14B",
          getCost: () => 0,
        },
      ],
      priceIndicator: "lowest" as PriceBracket,
      default: true,
    },
  },
};

export const GatewayProviderClient = ({
  children,
}: {
  children: ReactNode;
  models?: unknown[];
  imageModels?: unknown[];
  videoModels?: unknown[];
}) => {
  return (
    <GatewayContext.Provider value={HARDCODED_MODELS}>
      {children}
    </GatewayContext.Provider>
  );
};
