"use client";

import { atom } from "jotai";
import { useAtom } from "jotai";
import { useCallback, useEffect, useState } from "react";
import { PlusIcon, TrashIcon, UserIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

// Atom to track currently selected avatar for generation
export const selectedAvatarAtom = atom<{ id: string; name: string; faceImageUrl: string } | null>(null);

interface Avatar {
  id: string;
  brand_agent_id: string;
  name: string;
  role: string;
  face_image_url: string;
  created_at: string;
}

interface AvatarManagerProps {
  agentId: string;
}

export function AvatarManager({ agentId }: AvatarManagerProps) {
  const [avatars, setAvatars] = useState<Avatar[]>([]);
  const [selectedAvatar, setSelectedAvatar] = useAtom(selectedAvatarAtom);
  const [showForm, setShowForm] = useState(false);
  const [newName, setNewName] = useState("");
  const [newRole, setNewRole] = useState("model");
  const [newFaceUrl, setNewFaceUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchAvatars = useCallback(async () => {
    const res = await fetch(`/api/avatars?agentId=${agentId}`);
    if (res.ok) {
      const data = await res.json();
      setAvatars(data);
    }
  }, [agentId]);

  useEffect(() => {
    fetchAvatars();
  }, [fetchAvatars]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Imagem muito grande (max 5MB)");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setNewFaceUrl(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleCreate = async () => {
    if (!newName.trim() || !newFaceUrl) {
      toast.error("Nome e foto sao obrigatorios");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/avatars", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          brandAgentId: agentId,
          name: newName.trim(),
          role: newRole,
          faceImageUrl: newFaceUrl,
        }),
      });
      if (res.ok) {
        toast.success("Avatar criado!");
        setNewName("");
        setNewRole("model");
        setNewFaceUrl(null);
        setShowForm(false);
        fetchAvatars();
      } else {
        const err = await res.json();
        toast.error(err.error || "Erro ao criar avatar");
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    const res = await fetch(`/api/avatars?id=${id}`, { method: "DELETE" });
    if (res.ok) {
      toast.success("Avatar removido");
      if (selectedAvatar?.id === id) setSelectedAvatar(null);
      fetchAvatars();
    }
  };

  const handleSelect = (avatar: Avatar) => {
    if (selectedAvatar?.id === avatar.id) {
      setSelectedAvatar(null); // toggle off
    } else {
      setSelectedAvatar({ id: avatar.id, name: avatar.name, faceImageUrl: avatar.face_image_url });
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium flex items-center gap-2">
          <UserIcon className="size-4" /> Avatares
        </h3>
        <button
          onClick={() => setShowForm(!showForm)}
          className="text-xs text-primary hover:underline flex items-center gap-1"
        >
          <PlusIcon className="size-3" /> Novo
        </button>
      </div>

      {/* Avatar list */}
      {avatars.length === 0 && !showForm && (
        <p className="text-xs text-muted-foreground">Nenhum avatar criado. Crie um para preservar rostos nas geracoes.</p>
      )}

      <div className="space-y-2">
        {avatars.map((av) => (
          <button
            key={av.id}
            onClick={() => handleSelect(av)}
            className={cn(
              "flex items-center gap-3 w-full rounded-lg border p-2 text-left transition-colors",
              selectedAvatar?.id === av.id
                ? "border-primary bg-primary/5"
                : "border-border hover:border-primary/50",
            )}
          >
            <img
              src={av.face_image_url}
              alt={av.name}
              className="size-10 rounded-full object-cover shrink-0"
            />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{av.name}</div>
              <div className="text-[10px] text-muted-foreground">{av.role}</div>
            </div>
            {selectedAvatar?.id === av.id && (
              <span className="text-[10px] text-primary font-medium shrink-0">Ativo</span>
            )}
            <button
              onClick={(e) => { e.stopPropagation(); handleDelete(av.id); }}
              className="text-muted-foreground hover:text-destructive shrink-0"
            >
              <TrashIcon className="size-3.5" />
            </button>
          </button>
        ))}
      </div>

      {/* Create form */}
      {showForm && (
        <div className="space-y-2 rounded-lg border border-border p-3">
          {newFaceUrl ? (
            <img src={newFaceUrl} alt="Preview" className="size-16 rounded-full object-cover mx-auto" />
          ) : (
            <label className="flex items-center justify-center size-16 rounded-full bg-secondary mx-auto cursor-pointer hover:bg-secondary/80">
              <UserIcon className="size-6 text-muted-foreground" />
              <input type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
            </label>
          )}
          <input
            type="text"
            placeholder="Nome (ex: Ana -- fundadora)"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            className="w-full rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-sm"
          />
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="w-full rounded-md border border-border bg-secondary/30 px-3 py-1.5 text-sm"
          >
            <option value="model">Modelo</option>
            <option value="founder">Fundador(a)</option>
            <option value="mascot">Mascote</option>
            <option value="spokesperson">Porta-voz</option>
          </select>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowForm(false); setNewFaceUrl(null); setNewName(""); }}
              className="flex-1 rounded-md border border-border px-3 py-1.5 text-sm text-muted-foreground hover:bg-secondary"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreate}
              disabled={loading || !newName.trim() || !newFaceUrl}
              className="flex-1 rounded-md bg-primary px-3 py-1.5 text-sm text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? "Criando..." : "Criar"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
