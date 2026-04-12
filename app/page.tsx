"use client";

import {
  MenuIcon,
  PanelLeftCloseIcon,
  PlusIcon,
  SaveIcon,
  Settings2Icon,
  Trash2Icon,
  XIcon,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Canvas } from "@/components/canvas";
import { ChatPanel } from "@/components/chat-panel";
import { Controls } from "@/components/controls";
import { Toolbar } from "@/components/toolbar";
import { GatewayProvider } from "@/providers/gateway";
import { ReactFlowProvider } from "@/providers/react-flow";

type ViewMode = "app" | "studio";

interface AgentInfo {
  id: string;
  name: string;
}

const Index = () => {
  const [view, setView] = useState<ViewMode>("app");
  const [mobileChatOpen, setMobileChatOpen] = useState(false);
  const [agent, setAgent] = useState<AgentInfo | null>(null);
  const [agents, setAgents] = useState<AgentInfo[]>([]);
  const [showAgentMenu, setShowAgentMenu] = useState(false);

  // Load active agent from localStorage + fetch agents list
  useEffect(() => {
    const id = localStorage.getItem("active_agent_id");
    const name = localStorage.getItem("active_agent_name");
    if (id && name) {
      setAgent({ id, name });
    }

    fetch("/api/brand-agents")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) {
          setAgents(data.map((a: AgentInfo) => ({ id: a.id, name: a.name })));
          // If no active agent but agents exist, use the first one
          if (!id && data.length > 0) {
            setAgent({ id: data[0].id, name: data[0].name });
            localStorage.setItem("active_agent_id", data[0].id);
            localStorage.setItem("active_agent_name", data[0].name);
          }
        }
      })
      .catch(() => {});
  }, []);

  const switchAgent = (a: AgentInfo) => {
    setAgent(a);
    localStorage.setItem("active_agent_id", a.id);
    localStorage.setItem("active_agent_name", a.name);
    setShowAgentMenu(false);
  };

  const deleteAgent = async (e: React.MouseEvent, a: AgentInfo) => {
    e.stopPropagation();
    if (!confirm(`Deletar "${a.name}"? Esta ação não pode ser desfeita.`)) return;

    await fetch(`/api/brand-agents/${a.id}`, { method: "DELETE" });

    const updated = agents.filter((ag) => ag.id !== a.id);
    setAgents(updated);

    if (agent?.id === a.id) {
      const next = updated[0] ?? null;
      setAgent(next);
      if (next) {
        localStorage.setItem("active_agent_id", next.id);
        localStorage.setItem("active_agent_name", next.name);
      } else {
        localStorage.removeItem("active_agent_id");
        localStorage.removeItem("active_agent_name");
      }
    }

    setShowAgentMenu(false);
  };

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

              {/* Active agent indicator */}
              {agent && (
                <div className="relative">
                  <button
                    onClick={() => setShowAgentMenu(!showAgentMenu)}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium hover:bg-primary/20 transition-colors"
                  >
                    <div className="size-1.5 rounded-full bg-primary" />
                    {agent.name}
                  </button>

                  {/* Agent dropdown */}
                  {showAgentMenu && (
                    <div className="absolute top-full left-0 mt-1 w-56 rounded-xl border border-border bg-background shadow-lg z-50 py-1">
                      {agents.map((a) => (
                        <div key={a.id} className="flex items-center group">
                          <button
                            onClick={() => switchAgent(a)}
                            className={`flex-1 text-left px-3 py-2 text-sm hover:bg-secondary/60 transition-colors ${
                              a.id === agent.id ? "text-primary font-medium" : "text-foreground"
                            }`}
                          >
                            {a.name}
                          </button>
                          <button
                            onClick={(e) => deleteAgent(e, a)}
                            className="opacity-0 group-hover:opacity-100 px-2 py-2 text-muted-foreground hover:text-destructive transition-all"
                            title="Deletar agente"
                          >
                            <Trash2Icon className="size-3.5" />
                          </button>
                        </div>
                      ))}
                      <div className="border-t border-border my-1" />
                      <Link
                        href="/onboarding"
                        className="flex items-center gap-2 w-full text-left px-3 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-secondary/60 transition-colors"
                      >
                        <PlusIcon className="size-3.5" />
                        Novo Brand Agent
                      </Link>
                    </div>
                  )}
                </div>
              )}

              {/* No agent — prompt to create */}
              {!agent && agents.length === 0 && (
                <Link
                  href="/onboarding"
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-dashed border-primary/50 text-primary text-xs font-medium hover:bg-primary/10 transition-colors"
                >
                  <PlusIcon className="size-3" />
                  Criar Brand Agent
                </Link>
              )}
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
                <ChatPanel fullscreen agentId={agent?.id} />
              </div>
            ) : (
              /* Studio view — chat sidebar + canvas */
              <>
                {/* Desktop sidebar */}
                <div className="hidden md:flex">
                  <ChatPanel agentId={agent?.id} />
                </div>

                {/* Mobile chat overlay */}
                {mobileChatOpen && (
                  <div className="absolute inset-0 top-12 z-40 flex md:hidden">
                    <div className="flex-1 max-w-full">
                      <ChatPanel fullscreen agentId={agent?.id} />
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
                    <Toolbar onToggleChat={() => setMobileChatOpen(!mobileChatOpen)} />
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
