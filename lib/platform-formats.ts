export interface PlatformFormat {
  id: string;
  platform: string;
  format_name: string;
  width: number;
  height: number;
  aspect_ratio: string;
  notes: string | null;
}

// Hardcoded formats (matching the seeded data in platform_formats table)
const PLATFORM_FORMATS: PlatformFormat[] = [
  // Instagram
  { id: "ig-feed-sq", platform: "instagram", format_name: "Feed Square", width: 1080, height: 1080, aspect_ratio: "1:1", notes: null },
  { id: "ig-feed-port", platform: "instagram", format_name: "Feed Portrait", width: 1080, height: 1350, aspect_ratio: "4:5", notes: null },
  { id: "ig-feed-land", platform: "instagram", format_name: "Feed Landscape", width: 1080, height: 566, aspect_ratio: "1.91:1", notes: null },
  { id: "ig-story", platform: "instagram", format_name: "Story / Reels", width: 1080, height: 1920, aspect_ratio: "9:16", notes: null },
  // LinkedIn
  { id: "li-feed", platform: "linkedin", format_name: "Feed Post", width: 1200, height: 627, aspect_ratio: "1.91:1", notes: null },
  { id: "li-square", platform: "linkedin", format_name: "Square Post", width: 1080, height: 1080, aspect_ratio: "1:1", notes: null },
  { id: "li-article", platform: "linkedin", format_name: "Article Cover", width: 1280, height: 720, aspect_ratio: "16:9", notes: null },
  // Twitter/X
  { id: "tw-post", platform: "twitter", format_name: "Post Image", width: 1200, height: 675, aspect_ratio: "16:9", notes: null },
  { id: "tw-header", platform: "twitter", format_name: "Header", width: 1500, height: 500, aspect_ratio: "3:1", notes: null },
  // Facebook
  { id: "fb-feed", platform: "facebook", format_name: "Feed Post", width: 1200, height: 630, aspect_ratio: "1.91:1", notes: null },
  { id: "fb-square", platform: "facebook", format_name: "Square Post", width: 1080, height: 1080, aspect_ratio: "1:1", notes: null },
  { id: "fb-story", platform: "facebook", format_name: "Story", width: 1080, height: 1920, aspect_ratio: "9:16", notes: null },
  { id: "fb-cover", platform: "facebook", format_name: "Cover Photo", width: 1640, height: 856, aspect_ratio: "1.91:1", notes: null },
  // YouTube
  { id: "yt-thumb", platform: "youtube", format_name: "Thumbnail", width: 1280, height: 720, aspect_ratio: "16:9", notes: null },
  { id: "yt-banner", platform: "youtube", format_name: "Channel Banner", width: 2560, height: 1440, aspect_ratio: "16:9", notes: null },
  // TikTok
  { id: "tt-post", platform: "tiktok", format_name: "Post / Story", width: 1080, height: 1920, aspect_ratio: "9:16", notes: null },
  // Pinterest
  { id: "pin-standard", platform: "pinterest", format_name: "Standard Pin", width: 1000, height: 1500, aspect_ratio: "2:3", notes: null },
  { id: "pin-long", platform: "pinterest", format_name: "Long Pin", width: 1000, height: 2100, aspect_ratio: "1:2.1", notes: null },
  // WhatsApp
  { id: "wa-status", platform: "whatsapp", format_name: "Status", width: 1080, height: 1920, aspect_ratio: "9:16", notes: null },
  { id: "wa-profile", platform: "whatsapp", format_name: "Profile Photo", width: 500, height: 500, aspect_ratio: "1:1", notes: null },
  // Threads
  { id: "th-post", platform: "threads", format_name: "Post", width: 1080, height: 1080, aspect_ratio: "1:1", notes: null },
];

export function getPlatformFormats(): PlatformFormat[] {
  return PLATFORM_FORMATS;
}

export function groupByPlatform(formats: PlatformFormat[]): Record<string, PlatformFormat[]> {
  return formats.reduce((acc, f) => {
    (acc[f.platform] ??= []).push(f);
    return acc;
  }, {} as Record<string, PlatformFormat[]>);
}
