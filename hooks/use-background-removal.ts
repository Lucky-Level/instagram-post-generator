// hooks/use-background-removal.ts
import { useCallback, useRef, useState } from "react";

type BgRemovalStatus = "idle" | "loading" | "processing" | "done" | "error";

export function useBackgroundRemoval() {
  const [status, setStatus] = useState<BgRemovalStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const loadedRef = useRef(false);

  const removeBackground = useCallback(async (file: File): Promise<string | null> => {
    setError(null);
    setStatus("loading");

    try {
      // Dynamic import to avoid SSR — WASM only runs in browser
      const { removeBackground: removeBg } = await import("@imgly/background-removal");
      loadedRef.current = true;
      setStatus("processing");

      const resultBlob = await removeBg(file, {
        output: { format: "image/png", quality: 0.9 },
      });

      // Convert Blob to base64 data URL without using Buffer (browser-safe)
      const arrayBuffer = await resultBlob.arrayBuffer();
      const uint8Array = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < uint8Array.length; i++) {
        binary += String.fromCharCode(uint8Array[i]);
      }
      const base64 = btoa(binary);
      const dataUrl = `data:image/png;base64,${base64}`;

      setStatus("done");
      return dataUrl;
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Falha ao remover fundo";
      setError(msg);
      setStatus("error");
      return null;
    }
  }, []);

  return { removeBackground, status, error };
}
