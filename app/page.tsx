"use client";

import {
  MenuIcon,
  PanelLeftCloseIcon,
  SaveIcon,
  Settings2Icon,
  XIcon,
} from "lucide-react";
import { useState } from "react";
import { Canvas } from "@/components/canvas";
import { ChatPanel } from "@/components/chat-panel";
import { Controls } from "@/components/controls";
import { Toolbar } from "@/components/toolbar";
import { GatewayProvider } from "@/providers/gateway";
import { ReactFlowProvider } from "@/providers/react-flow";

type ViewMode = "app" | "studio";

const Index = () => {
  const [view, setView] = useState<ViewMode>("app");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);

  return (
    <GatewayProvider>
      <ReactFlowProvider>
        <div className="flex h-[100dvh] w-screen flex-col overflow-hidden">
          {/* Header */}
          <header className="flex items-center justify-between border-b border-border bg-background px-3 sm:px-4 h-12 shrink-0">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Mobile menu button (Studio view) */}
              {view === "studio" && (
                <button
                  onClick={() => setMobileChatOpen(!mobileChatOpen)}
                  className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors md:hidden"
                >
                  {mobileChatOpen ? (
                    <PanelLeftCloseIcon className="size-4" />
                  ) : (
                    <MenuIcon className="size-4" />
                  )}
                </button>
              )}
              <span className="text-sm font-medium tracking-tight text-foreground">
                post<span className="text-primary">.</span>agent
              </span>
            </div>

            <div className="flex items-center gap-0.5 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => {
                  setView("app");
                  setMobileChatOpen(false);
                }}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  view === "app"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                App
              </button>
              <button
                onClick={() => setView("studio")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  view === "studio"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Studio
              </button>
            </div>

            <div className="flex items-center gap-1">
              <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors hidden sm:flex">
                <Settings2Icon className="size-4" />
              </button>
              <button className="p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors hidden sm:flex">
                <SaveIcon className="size-4" />
              </button>
            </div>
          </header>

          {/* Content area */}
          <div className="flex flex-1 items-stretch overflow-hidden">
            {view === "app" ? (
              /* App view — fullscreen chat, centered and polished */
              <div className="flex-1 flex items-stretch justify-center">
                <ChatPanel fullscreen />
              </div>
            ) : (
              /* Studio view — chat sidebar + canvas */
              <>
                {/* Desktop sidebar */}
                <div className="hidden md:flex">
                  <ChatPanel />
                </div>

                {/* Mobile chat overlay */}
                {mobileChatOpen && (
                  <div className="absolute inset-0 top-12 z-40 flex md:hidden">
                    <div className="flex-1 max-w-full">
                      <ChatPanel fullscreen />
                    </div>
                    <button
                      onClick={() => setMobileChatOpen(false)}
                      className="absolute top-3 right-3 z-50 size-8 rounded-full bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                    >
                      <XIcon className="size-4" />
                    </button>
                  </div>
                )}

                {/* Canvas */}
                <div className="relative flex-1">
                  <Canvas>
                    <Controls />
                    <Toolbar />
                  </Canvas>
                </div>
              </>
            )}
          </div>
        </div>
      </ReactFlowProvider>
    </GatewayProvider>
  );
};

export default Index;
