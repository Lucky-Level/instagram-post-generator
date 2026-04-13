// hooks/use-background-removal.ts
import { useCallback, useState } from "react";

type BgRemovalStatus = "idle" | "loading" | "processing" | "done" | "error";

export function useBackgroundRemoval() {
  const [status, setStatus] = useState<BgRemovalStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const removeBackground = useCallback(async (file: File): Promise<string | null> => {
    setError(null);
    setStatus("loading");

    try {
      // Dynamic import to avoid SSR — WASM only runs in browser
      const { removeBackground: removeBg } = await import("@imgly/background-removal");
      setStatus("processing");

      const resultBlob = await removeBg(file, {
        output: { format: "image/png", quality: 0.9 },
      });

      // Convert Blob to base64 data URL using FileReader (browser-native, O(n))
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const fileReader = new FileReader();
        fileReader.onload = () => resolve(fileReader.result as string);
        fileReader.onerror = reject;
        fileReader.readAsDataURL(resultBlob);
      });

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
