const POPULAR_FONTS = [
  "Inter",
  "Roboto",
  "Open Sans",
  "Montserrat",
  "Poppins",
  "Lato",
  "Oswald",
  "Raleway",
  "Playfair Display",
  "Bebas Neue",
  "Nunito",
  "DM Sans",
  "Space Grotesk",
  "Archivo Black",
  "Rubik",
  "Permanent Marker",
] as const;

const loadedFonts = new Set<string>();

export function getPopularFonts(): string[] {
  return [...POPULAR_FONTS];
}

export async function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@400;700&display=swap`;

  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);

  // Wait for the font to actually load
  try {
    await document.fonts.load(`16px "${family}"`);
    await document.fonts.ready;
  } catch {
    // Font load failed silently — Fabric will use fallback
  }

  loadedFonts.add(family);

  // Clear Fabric's font cache so it re-measures with the new font
  try {
    const fabric = await import("fabric");
    if (fabric.cache && typeof fabric.cache.clearFontCache === "function") {
      fabric.cache.clearFontCache(family);
    }
  } catch {
    // Fabric not loaded yet, no cache to clear
  }
}
