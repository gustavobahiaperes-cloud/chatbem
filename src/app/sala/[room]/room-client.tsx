"use client";

import "@livekit/components-styles";
import { LiveKitRoom, VideoConference } from "@livekit/components-react";
import { useState } from "react";

type Stage = "name" | "connecting" | "call" | "error";

export default function RoomClient({ room }: { room: string }) {
  const [stage, setStage] = useState<Stage>("name");
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [copied, setCopied] = useState(false);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;

    setStage("connecting");
    setError("");
    try {
      const res = await fetch("/api/token", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, name: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Não deu para entrar na sala.");
      setToken(data.token);
      setServerUrl(data.url);
      setStage("call");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erro desconhecido.");
      setStage("error");
    }
  }

  function copyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => {});
  }

  if (stage === "call") {
    return (
      <LiveKitRoom
        serverUrl={serverUrl}
        token={token}
        connect
        video
        audio
        data-lk-theme="default"
        style={{ height: "100dvh" }}
        onDisconnected={() => setStage("name")}
      >
        <VideoConference />
      </LiveKitRoom>
    );
  }

  return (
    <main className="flex flex-1 items-center justify-center px-5 py-12">
      <div className="w-full max-w-md flex flex-col gap-8">
        <div className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-text-muted">
          <span className="h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" />
          Sala &middot; {room}
        </div>

        <div className="rounded-[22px] border border-border bg-surface p-8 shadow-[0_24px_60px_-32px_rgba(20,18,27,0.5)] flex flex-col gap-6">
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              aria-hidden
              className="grid h-[84px] w-[84px] place-items-center rounded-full border border-border"
              style={{
                background:
                  "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent) 55%, var(--surface)) 0%, var(--surface) 72%)",
              }}
            >
              <span className="h-[30px] w-[30px] rounded-full bg-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_16%,transparent)]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[28px] font-normal leading-tight text-balance">
              Como você quer ser chamado?
            </h1>
            <p className="max-w-[38ch] text-[14.5px] leading-relaxed text-text-muted">
              O navegador vai pedir permissão para usar câmera e microfone assim que você entrar.
            </p>
          </div>

          <form onSubmit={join} className="flex flex-col gap-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={40}
              className="rounded-[14px] border border-border bg-surface-sunken px-4 py-3 text-sm text-text outline-none focus-visible:border-accent-2"
            />
            <button
              type="submit"
              disabled={stage === "connecting" || !name.trim()}
              className="flex items-center justify-center gap-2 rounded-[14px] bg-accent px-6 py-4 text-base font-bold text-accent-ink shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-transform hover:-translate-y-px disabled:opacity-60 disabled:hover:translate-y-0"
            >
              {stage === "connecting" ? "Entrando..." : "Entrar na chamada"}
            </button>
          </form>

          {stage === "error" && (
            <p className="rounded-[12px] bg-accent-soft px-4 py-3 text-sm text-text">{error}</p>
          )}

          <button
            type="button"
            onClick={copyLink}
            className="self-center text-xs font-semibold text-accent-2 underline decoration-dotted underline-offset-4"
          >
            {copied ? "Link copiado!" : "Copiar link desta sala"}
          </button>
        </div>
      </div>
    </main>
  );
}
