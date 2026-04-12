"use client";

import {
  ArrowLeftIcon,
  ArrowRightIcon,
  CheckIcon,
  ImageIcon,
  Loader2Icon,
  PaletteIcon,
  PlusIcon,
  SparklesIcon,
  TypeIcon,
  UploadIcon,
  XIcon,
} from "lucide-react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// ── Steps ──────────────────────────────────────────
const STEPS = [
  { id: "name", label: "Marca", icon: SparklesIcon },
  { id: "colors", label: "Cores", icon: PaletteIcon },
  { id: "fonts", label: "Fontes", icon: TypeIcon },
  { id: "personality", label: "Tom", icon: SparklesIcon },
  { id: "references", label: "Referencias", icon: ImageIcon },
] as const;

type StepId = (typeof STEPS)[number]["id"];

// ── Color presets ──────────────────────────────────
const COLOR_PRESETS = [
  { name: "Ocean", primary: "#0EA5E9", secondary: "#F0F9FF", accent: "#0369A1" },
  { name: "Forest", primary: "#22C55E", secondary: "#F0FDF4", accent: "#15803D" },
  { name: "Sunset", primary: "#F97316", secondary: "#FFF7ED", accent: "#C2410C" },
  { name: "Royal", primary: "#8B5CF6", secondary: "#F5F3FF", accent: "#6D28D9" },
  { name: "Rose", primary: "#F43F5E", secondary: "#FFF1F2", accent: "#BE123C" },
  { name: "Midnight", primary: "#6366F1", secondary: "#0F172A", accent: "#818CF8" },
  { name: "Clean", primary: "#18181B", secondary: "#FFFFFF", accent: "#3B82F6" },
  { name: "Warm", primary: "#D97706", secondary: "#FFFBEB", accent: "#92400E" },
];

// ── Popular Google Fonts ───────────────────────────
const POPULAR_FONTS = [
  { family: "Inter", category: "sans-serif" },
  { family: "Poppins", category: "sans-serif" },
  { family: "Roboto", category: "sans-serif" },
  { family: "Space Grotesk", category: "sans-serif" },
  { family: "DM Sans", category: "sans-serif" },
  { family: "Playfair Display", category: "serif" },
  { family: "Lora", category: "serif" },
  { family: "Cormorant Garamond", category: "serif" },
  { family: "Merriweather", category: "serif" },
  { family: "Syne", category: "display" },
  { family: "Bebas Neue", category: "display" },
  { family: "Oswald", category: "sans-serif" },
  { family: "Raleway", category: "sans-serif" },
  { family: "Montserrat", category: "sans-serif" },
  { family: "Nunito", category: "sans-serif" },
  { family: "Work Sans", category: "sans-serif" },
];

// ── Tone presets ───────────────────────────────────
const TONE_PRESETS = [
  { label: "Profissional", value: "profissional, confiavel, serio", energy: "calma e estavel" },
  { label: "Premium", value: "premium, sofisticado, exclusivo", energy: "elegante e reservada" },
  { label: "Amigavel", value: "acessivel, amigavel, acolhedor", energy: "leve e calorosa" },
  { label: "Ousado", value: "ousado, disruptivo, inovador", energy: "alta e dinamica" },
  { label: "Minimalista", value: "minimalista, clean, essencial", energy: "serena e focada" },
  { label: "Divertido", value: "divertido, criativo, descontraido", energy: "energetica e alegre" },
];

// ── Audience presets ───────────────────────────────
const AUDIENCE_PRESETS = [
  "Jovens 18-30, urbanos, tech-savvy",
  "Profissionais 25-45, classe media-alta",
  "Mulheres 30-50, maes, lifestyle",
  "Empresarios e decisores B2B",
  "Estudantes e universitarios",
  "Publico geral, massa",
];

// ── Reference upload item ──────────────────────────
interface RefImage {
  url: string;
  file?: File;
  base64?: string;
  isAnti: boolean;
}

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state
  const [name, setName] = useState("");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [colors, setColors] = useState({ primary: "#18181B", secondary: "#FFFFFF", accent: "#3B82F6" });
  const [headingFont, setHeadingFont] = useState("Inter");
  const [bodyFont, setBodyFont] = useState("Inter");
  const [tone, setTone] = useState("");
  const [energy, setEnergy] = useState("");
  const [audience, setAudience] = useState("");
  const [visualLanguage, setVisualLanguage] = useState("");
  const [references, setReferences] = useState<RefImage[]>([]);

  const currentStep = STEPS[step];
  const isLast = step === STEPS.length - 1;
  const canNext =
    (currentStep.id === "name" && name.trim().length >= 2) ||
    currentStep.id === "colors" ||
    currentStep.id === "fonts" ||
    (currentStep.id === "personality" && tone.trim()) ||
    currentStep.id === "references";

  const handleLogoUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setLogoFile(file);
    setLogoUrl(URL.createObjectURL(file));
  };

  const handleRefUpload = useCallback(async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;
    const newRefs: RefImage[] = [];
    for (const file of Array.from(files)) {
      const url = URL.createObjectURL(file);
      const reader = new FileReader();
      const base64 = await new Promise<string>((resolve) => {
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
      newRefs.push({ url, file, base64, isAnti: false });
    }
    setReferences((prev) => [...prev, ...newRefs]);
    e.target.value = "";
  }, []);

  const removeRef = (idx: number) => {
    setReferences((prev) => prev.filter((_, i) => i !== idx));
  };

  const toggleAnti = (idx: number) => {
    setReferences((prev) =>
      prev.map((r, i) => (i === idx ? { ...r, isAnti: !r.isAnti } : r))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Upload logo if needed
      let finalLogoUrl = logoUrl;
      if (logoFile) {
        const formData = new FormData();
        formData.append("file", logoFile);
        const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
        if (uploadRes.ok) {
          const uploadData = await uploadRes.json();
          finalLogoUrl = uploadData.url;
        }
      }

      // Upload reference images
      const uploadedRefs: {
        url: string;
        is_anti: boolean;
        analysis?: string;
        dominantColors?: string[];
        layoutStructure?: string;
        visualStyle?: string;
        mood?: string;
        typographyDna?: Record<string, unknown>;
      }[] = [];

      for (const ref of references) {
        if (ref.file) {
          const formData = new FormData();
          formData.append("file", ref.file);
          const uploadRes = await fetch("/api/upload", { method: "POST", body: formData });
          if (!uploadRes.ok) continue;
          const uploadData = await uploadRes.json();
          const imageUrl = uploadData.url;

          // Analyze the reference image (best-effort, don't fail if analysis errors)
          let analysisData: {
            overallAnalysis?: string;
            dominantColors?: string[];
            layoutStructure?: string;
            visualStyle?: string;
            mood?: string;
            typographyDna?: Record<string, unknown>;
          } = {};
          try {
            const analyzeRes = await fetch("/api/analyze-reference", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ imageUrl }),
            });
            if (analyzeRes.ok) {
              analysisData = await analyzeRes.json();
            }
          } catch {
            // silent — analysis failure should not block agent creation
          }

          uploadedRefs.push({
            url: imageUrl,
            is_anti: ref.isAnti,
            analysis: analysisData.overallAnalysis,
            dominantColors: analysisData.dominantColors,
            layoutStructure: analysisData.layoutStructure,
            visualStyle: analysisData.visualStyle,
            mood: analysisData.mood,
            typographyDna: analysisData.typographyDna,
          });
        }
      }

      // Create brand agent
      const res = await fetch("/api/brand-agents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          avatar_url: finalLogoUrl || null,
          personality: {
            tone,
            energy,
            audience,
            visual_language: visualLanguage,
          },
          brand_kit: {
            colors,
            fonts: { heading: headingFont, body: bodyFont },
            logos: finalLogoUrl ? [finalLogoUrl] : [],
          },
          references: uploadedRefs,
          fonts: [
            { family: headingFont, category: getFontCategory(headingFont), role: "heading" },
            { family: bodyFont, category: getFontCategory(bodyFont), role: "body" },
          ],
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || "Failed to create brand agent");
      }

      const agent = await res.json();
      toast.success(`Brand Agent "${name}" criado!`);

      // Store active agent ID for the main app
      localStorage.setItem("active_agent_id", agent.id);
      localStorage.setItem("active_agent_name", agent.name);

      router.push("/");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao criar agente");
    } finally {
      setSaving(false);
    }
  };

  const getFontCategory = (family: string) => {
    return POPULAR_FONTS.find((f) => f.family === family)?.category || "sans-serif";
  };

  return (
    <div className="flex min-h-[100dvh] flex-col bg-background">
      {/* Header */}
      <header className="flex items-center justify-between border-b border-border px-4 h-12 shrink-0">
        <span className="text-sm font-medium tracking-tight">
          post<span className="text-primary">.</span>agent
        </span>
        <span className="text-xs text-muted-foreground">Novo Brand Agent</span>
      </header>

      {/* Progress */}
      <div className="border-b border-border px-4 py-3">
        <div className="flex items-center gap-1 max-w-xl mx-auto">
          {STEPS.map((s, i) => (
            <button
              key={s.id}
              onClick={() => i <= step && setStep(i)}
              className={cn(
                "flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
                i === step
                  ? "bg-primary text-primary-foreground"
                  : i < step
                    ? "bg-primary/10 text-primary cursor-pointer"
                    : "text-muted-foreground"
              )}
            >
              {i < step ? (
                <CheckIcon className="size-3" />
              ) : (
                <s.icon className="size-3" />
              )}
              <span className="hidden sm:inline">{s.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
          {/* ── Step: Name ───────────────────────────── */}
          {currentStep.id === "name" && (
            <>
              <div>
                <h2 className="text-xl font-semibold">Como se chama sua marca?</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  O Brand Agent vai usar essa identidade em tudo que criar.
                </p>
              </div>

              <div className="space-y-4">
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Connect Cleaner, Lucky Level..."
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-3 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                  autoFocus
                />

                {/* Logo upload */}
                <div>
                  <label className="text-xs font-medium text-muted-foreground mb-2 block">
                    Logo (opcional)
                  </label>
                  {logoUrl ? (
                    <div className="relative inline-block">
                      <Image
                        src={logoUrl}
                        alt="Logo"
                        width={80}
                        height={80}
                        className="rounded-xl border border-border object-contain size-20 bg-white"
                      />
                      <button
                        onClick={() => { setLogoUrl(""); setLogoFile(null); }}
                        className="absolute -top-1.5 -right-1.5 size-5 rounded-full bg-destructive text-white flex items-center justify-center"
                      >
                        <XIcon className="size-3" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => document.getElementById("logo-input")?.click()}
                      className="flex items-center gap-2 rounded-xl border border-dashed border-border px-4 py-3 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
                    >
                      <UploadIcon className="size-4" />
                      Upload do logo
                    </button>
                  )}
                  <input
                    id="logo-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleLogoUpload}
                  />
                </div>
              </div>
            </>
          )}

          {/* ── Step: Colors ─────────────────────────── */}
          {currentStep.id === "colors" && (
            <>
              <div>
                <h2 className="text-xl font-semibold">Cores da marca</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha um preset ou defina as cores manualmente.
                </p>
              </div>

              {/* Presets */}
              <div className="grid grid-cols-4 gap-2">
                {COLOR_PRESETS.map((p) => (
                  <button
                    key={p.name}
                    onClick={() => setColors({ primary: p.primary, secondary: p.secondary, accent: p.accent })}
                    className={cn(
                      "flex flex-col items-center gap-1.5 rounded-xl border p-3 transition-colors",
                      colors.primary === p.primary && colors.secondary === p.secondary
                        ? "border-primary bg-primary/5"
                        : "border-border hover:border-primary/30"
                    )}
                  >
                    <div className="flex gap-1">
                      <div className="size-5 rounded-full border border-border/50" style={{ backgroundColor: p.primary }} />
                      <div className="size-5 rounded-full border border-border/50" style={{ backgroundColor: p.secondary }} />
                      <div className="size-5 rounded-full border border-border/50" style={{ backgroundColor: p.accent }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{p.name}</span>
                  </button>
                ))}
              </div>

              {/* Manual color pickers */}
              <div className="grid grid-cols-3 gap-3">
                {(["primary", "secondary", "accent"] as const).map((key) => (
                  <label key={key} className="space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground capitalize">{key}</span>
                    <div className="flex items-center gap-2 rounded-lg border border-border px-3 py-2">
                      <input
                        type="color"
                        value={colors[key]}
                        onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                        className="size-6 rounded cursor-pointer border-0 p-0"
                      />
                      <input
                        type="text"
                        value={colors[key]}
                        onChange={(e) => setColors({ ...colors, [key]: e.target.value })}
                        className="w-full bg-transparent text-xs font-mono focus:outline-none"
                      />
                    </div>
                  </label>
                ))}
              </div>

              {/* Preview card */}
              <div className="rounded-xl border border-border overflow-hidden">
                <div className="p-4" style={{ backgroundColor: colors.secondary }}>
                  <div className="h-2 w-24 rounded-full mb-2" style={{ backgroundColor: colors.primary }} />
                  <div className="h-2 w-40 rounded-full mb-3 opacity-30" style={{ backgroundColor: colors.primary }} />
                  <div
                    className="inline-block rounded-lg px-3 py-1.5 text-xs font-medium text-white"
                    style={{ backgroundColor: colors.accent }}
                  >
                    Botao CTA
                  </div>
                </div>
              </div>
            </>
          )}

          {/* ── Step: Fonts ──────────────────────────── */}
          {currentStep.id === "fonts" && (
            <>
              <div>
                <h2 className="text-xl font-semibold">Fontes da marca</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Escolha a fonte para titulos e para texto do corpo.
                </p>
              </div>

              {/* Heading font */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Fonte de titulo</label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_FONTS.map((f) => (
                    <button
                      key={`h-${f.family}`}
                      onClick={() => setHeadingFont(f.family)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        headingFont === f.family
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-sm font-medium">{f.family}</span>
                      <span className="block text-[10px] text-muted-foreground">{f.category}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Body font */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Fonte de corpo</label>
                <div className="grid grid-cols-2 gap-2">
                  {POPULAR_FONTS.filter((f) => f.category === "sans-serif").map((f) => (
                    <button
                      key={`b-${f.family}`}
                      onClick={() => setBodyFont(f.family)}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        bodyFont === f.family
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-sm font-medium">{f.family}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div className="rounded-xl border border-border p-4 space-y-2">
                <p className="text-lg font-semibold">{headingFont} (titulo)</p>
                <p className="text-sm text-muted-foreground">{bodyFont} (corpo) — Texto de exemplo para visualizar como fica a combinacao das fontes selecionadas na sua marca.</p>
              </div>
            </>
          )}

          {/* ── Step: Personality ─────────────────────── */}
          {currentStep.id === "personality" && (
            <>
              <div>
                <h2 className="text-xl font-semibold">Personalidade da marca</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Como o agente deve pensar e criar para sua marca?
                </p>
              </div>

              {/* Tone presets */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Tom de voz</label>
                <div className="grid grid-cols-3 gap-2">
                  {TONE_PRESETS.map((t) => (
                    <button
                      key={t.label}
                      onClick={() => { setTone(t.value); setEnergy(t.energy); }}
                      className={cn(
                        "rounded-lg border px-3 py-2.5 text-left transition-colors",
                        tone === t.value
                          ? "border-primary bg-primary/5"
                          : "border-border hover:border-primary/30"
                      )}
                    >
                      <span className="text-sm font-medium">{t.label}</span>
                      <span className="block text-[10px] text-muted-foreground mt-0.5">{t.energy}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Custom tone */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Ou descreva o tom</label>
                <input
                  type="text"
                  value={tone}
                  onChange={(e) => setTone(e.target.value)}
                  placeholder="Ex: tech-forward, inovador, ousado"
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Audience */}
              <div className="space-y-2">
                <label className="text-xs font-medium text-muted-foreground">Publico-alvo</label>
                <div className="flex flex-wrap gap-1.5">
                  {AUDIENCE_PRESETS.map((a) => (
                    <button
                      key={a}
                      onClick={() => setAudience(a)}
                      className={cn(
                        "rounded-full border px-3 py-1.5 text-xs transition-colors",
                        audience === a
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border text-muted-foreground hover:text-foreground"
                      )}
                    >
                      {a}
                    </button>
                  ))}
                </div>
                <input
                  type="text"
                  value={audience}
                  onChange={(e) => setAudience(e.target.value)}
                  placeholder="Ou descreva seu publico..."
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>

              {/* Visual language */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground">Linguagem visual (opcional)</label>
                <input
                  type="text"
                  value={visualLanguage}
                  onChange={(e) => setVisualLanguage(e.target.value)}
                  placeholder="Ex: minimalista, fundo escuro, gradientes neon..."
                  className="w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-1 focus:ring-primary/50"
                />
              </div>
            </>
          )}

          {/* ── Step: References ──────────────────────── */}
          {currentStep.id === "references" && (
            <>
              <div>
                <h2 className="text-xl font-semibold">Referencias visuais</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Mande posts que voce gosta (e os que voce NAO gosta). O agente aprende com cada um.
                </p>
              </div>

              {/* Upload area */}
              <button
                onClick={() => fileInputRef.current?.click()}
                className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border py-8 text-sm text-muted-foreground hover:border-primary/50 hover:text-foreground transition-colors"
              >
                <PlusIcon className="size-5" />
                <span>Adicionar imagens de referencia</span>
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={handleRefUpload}
              />

              {/* Reference grid */}
              {references.length > 0 && (
                <div className="grid grid-cols-3 gap-3">
                  {references.map((ref, idx) => (
                    <div key={idx} className="relative group">
                      <Image
                        src={ref.url}
                        alt={`Ref ${idx + 1}`}
                        width={200}
                        height={200}
                        className={cn(
                          "w-full aspect-square object-cover rounded-xl border-2 transition-colors",
                          ref.isAnti
                            ? "border-destructive opacity-60"
                            : "border-border"
                        )}
                      />
                      {/* Anti-reference badge */}
                      {ref.isAnti && (
                        <div className="absolute top-1 left-1 bg-destructive text-white text-[9px] font-bold px-1.5 py-0.5 rounded">
                          NAO
                        </div>
                      )}
                      {/* Action buttons */}
                      <div className="absolute top-1 right-1 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => toggleAnti(idx)}
                          className={cn(
                            "size-6 rounded-full flex items-center justify-center text-xs font-bold",
                            ref.isAnti
                              ? "bg-green-500 text-white"
                              : "bg-destructive text-white"
                          )}
                          title={ref.isAnti ? "Marcar como referencia" : "Marcar como anti-referencia"}
                        >
                          {ref.isAnti ? "+" : "-"}
                        </button>
                        <button
                          onClick={() => removeRef(idx)}
                          className="size-6 rounded-full bg-black/60 text-white flex items-center justify-center"
                        >
                          <XIcon className="size-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {references.length > 0 && (
                <p className="text-xs text-muted-foreground text-center">
                  Clique no botao <span className="text-destructive font-bold">-</span> para marcar como anti-referencia (o que NAO fazer)
                </p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer navigation */}
      <div className="border-t border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-xl mx-auto">
          <button
            onClick={() => step > 0 && setStep(step - 1)}
            disabled={step === 0}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm text-muted-foreground hover:text-foreground disabled:opacity-30 transition-colors"
          >
            <ArrowLeftIcon className="size-4" />
            Voltar
          </button>

          {isLast ? (
            <button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {saving ? (
                <Loader2Icon className="size-4 animate-spin" />
              ) : (
                <CheckIcon className="size-4" />
              )}
              {saving ? "Criando..." : "Criar Brand Agent"}
            </button>
          ) : (
            <button
              onClick={() => canNext && setStep(step + 1)}
              disabled={!canNext}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 disabled:opacity-30 transition-colors"
            >
              Proximo
              <ArrowRightIcon className="size-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
