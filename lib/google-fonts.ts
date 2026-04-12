export const FONT_CATEGORIES: Record<string, string[]> = {
  "Sans-serif": [
    "Inter", "Roboto", "Open Sans", "Poppins", "Montserrat",
    "DM Sans", "Space Grotesk", "Nunito", "Raleway", "Rubik",
    "Barlow", "Outfit", "Plus Jakarta Sans",
  ],
  "Serif": [
    "Playfair Display", "Lora", "Merriweather", "Cormorant Garamond",
    "EB Garamond", "DM Serif Display",
  ],
  "Display": [
    "Bebas Neue", "Anton", "Oswald", "Archivo Black", "Black Ops One",
    "Dela Gothic One", "Boogaloo", "Righteous", "Baloo 2",
    "Fredoka", "Alfa Slab One", "Permanent Marker",
  ],
  "Script": [
    "Pacifico", "Lobster", "Dancing Script", "Satisfy", "Caveat",
    "Great Vibes",
  ],
  "Monospace": [
    "JetBrains Mono", "Fira Code", "Source Code Pro",
  ],
};

const loadedFonts = new Set<string>();

export function getFontCategories(): string[] {
  return Object.keys(FONT_CATEGORIES);
}

export function getFontsByCategory(cat: string): string[] {
  return FONT_CATEGORIES[cat] ?? [];
}

export function getAllFonts(): string[] {
  return Object.values(FONT_CATEGORIES).flat();
}

// Keep backward compatibility
export function getPopularFonts(): string[] {
  return getAllFonts();
}

export async function loadGoogleFont(family: string): Promise<void> {
  if (loadedFonts.has(family)) return;

  const url = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(family)}:wght@300;400;700&display=swap`;
  const link = document.createElement("link");
  link.rel = "stylesheet";
  link.href = url;
  document.head.appendChild(link);

  try {
    await document.fonts.load(`16px "${family}"`);
    await document.fonts.ready;
  } catch {
    // Font load failed silently
  }

  loadedFonts.add(family);

  try {
    const fabric = await import("fabric");
    if (fabric.cache && typeof fabric.cache.clearFontCache === "function") {
      fabric.cache.clearFontCache(family);
    }
  } catch {
    // Fabric not loaded yet
  }
}
