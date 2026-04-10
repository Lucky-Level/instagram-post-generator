"use client";

import { DownloadIcon, StarIcon, Trash2Icon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  type Asset,
  deleteAsset,
  getAssets,
  toggleBookmark,
} from "@/lib/asset-storage";
import { download } from "@/lib/download";

type Tab = "recent" | "bookmarked";

export default function AssetsPage() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [tab, setTab] = useState<Tab>("recent");

  useEffect(() => {
    setAssets(getAssets());
  }, []);

  const filtered =
    tab === "bookmarked" ? assets.filter((a) => a.bookmarked) : assets;

  const handleToggleBookmark = (id: string) => {
    toggleBookmark(id);
    setAssets(getAssets());
  };

  const handleDelete = (id: string) => {
    deleteAsset(id);
    setAssets(getAssets());
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 h-12">
        <div className="flex items-center gap-4">
          <Link href="/" className="font-semibold text-sm">
            post<span className="text-orange-500">·</span>agent
          </Link>
          <span className="text-muted-foreground text-sm">/ Assets</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="flex items-center gap-4 mb-6">
          <h1 className="text-2xl font-semibold">Assets</h1>
          <div className="flex gap-1 bg-secondary rounded-lg p-0.5">
            <button
              onClick={() => setTab("recent")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                tab === "recent"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Recent
            </button>
            <button
              onClick={() => setTab("bookmarked")}
              className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                tab === "bookmarked"
                  ? "bg-background shadow-sm"
                  : "text-muted-foreground"
              }`}
            >
              Bookmarked
            </button>
          </div>
        </div>

        {filtered.length === 0 && (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-lg font-medium">No assets yet</p>
            <p className="text-sm mt-1">
              Generated content will appear here.
            </p>
          </div>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filtered.map((asset) => (
            <div
              key={asset.id}
              className="group relative rounded-xl border overflow-hidden bg-card"
            >
              {asset.type === "image" && (
                <Image
                  src={asset.url}
                  alt={asset.prompt}
                  width={400}
                  height={400}
                  className="w-full aspect-square object-cover"
                />
              )}
              {asset.type === "video" && (
                <video
                  src={asset.url}
                  className="w-full aspect-square object-cover"
                  muted
                  loop
                  autoPlay
                  playsInline
                />
              )}
              {asset.type === "text" && (
                <div className="p-4 aspect-square flex items-center">
                  <p className="text-sm line-clamp-6">{asset.prompt}</p>
                </div>
              )}

              <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-end p-3 gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  onClick={() => handleToggleBookmark(asset.id)}
                >
                  <StarIcon
                    className={`size-3 ${asset.bookmarked ? "fill-yellow-400 text-yellow-400" : ""}`}
                  />
                </Button>
                <Button
                  size="icon"
                  variant="secondary"
                  className="size-8"
                  onClick={() =>
                    download(
                      { url: asset.url, type: asset.type },
                      asset.id,
                      asset.type === "video" ? "mp4" : "png",
                    )
                  }
                >
                  <DownloadIcon className="size-3" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  className="size-8"
                  onClick={() => handleDelete(asset.id)}
                >
                  <Trash2Icon className="size-3" />
                </Button>
              </div>

              <div className="p-2 text-xs text-muted-foreground truncate">
                {new Date(asset.createdAt).toLocaleDateString()}
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
