"use client";

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

  return (
    <GatewayProvider>
      <ReactFlowProvider>
        <div className="flex h-screen w-screen flex-col overflow-hidden">
          {/* Header with tabs */}
          <header className="flex items-center justify-between border-b bg-background px-4 h-12 shrink-0">
            <div className="flex items-center gap-3">
              <h1 className="font-semibold text-sm tracking-tight">
                post<span className="text-orange-500">·</span>agent
              </h1>
            </div>

            <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5">
              <button
                onClick={() => setView("app")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  view === "app"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                App
              </button>
              <button
                onClick={() => setView("studio")}
                className={`px-3 py-1 rounded-md text-xs font-medium transition ${
                  view === "studio"
                    ? "bg-background shadow-sm text-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Studio
              </button>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <a href="/assets" className="hover:text-foreground transition">
                Assets
              </a>
            </div>
          </header>

          {/* Content area */}
          <div className="flex flex-1 items-stretch overflow-hidden">
            {view === "app" ? (
              <div className="flex-1 flex items-stretch justify-center bg-secondary/30">
                <ChatPanel fullscreen />
              </div>
            ) : (
              <>
                <ChatPanel />
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
