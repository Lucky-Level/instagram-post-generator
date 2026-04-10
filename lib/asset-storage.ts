export interface Asset {
  id: string;
  type: "image" | "video" | "text";
  url: string; // base64 data URL or /uploads/ path
  prompt: string;
  createdAt: string;
  bookmarked: boolean;
  metadata?: Record<string, string>;
}

const STORAGE_KEY = "post-agent-assets";

export function getAssets(): Asset[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function saveAsset(
  asset: Omit<Asset, "id" | "createdAt" | "bookmarked">
): Asset {
  const assets = getAssets();
  const newAsset: Asset = {
    ...asset,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    bookmarked: false,
  };
  assets.unshift(newAsset);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets.slice(0, 200))); // keep last 200
  return newAsset;
}

export function toggleBookmark(id: string): void {
  const assets = getAssets();
  const idx = assets.findIndex((a) => a.id === id);
  if (idx >= 0) {
    assets[idx].bookmarked = !assets[idx].bookmarked;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
  }
}

export function deleteAsset(id: string): void {
  const assets = getAssets().filter((a) => a.id !== id);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(assets));
}
