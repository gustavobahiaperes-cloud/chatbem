"use client";

import { useEffect, useState } from "react";
import { Track } from "livekit-client";
import {
  DisconnectButton,
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useDataChannel,
  useLocalParticipant,
  useParticipants,
  useTracks,
  useTrackToggle,
} from "@livekit/components-react";
import type { Participant, RemoteParticipant } from "livekit-client";

type SilenceAlert = {
  identity: string;
  name: string;
  message: string;
  until: number;
};

function MicIcon({ off }: { off?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 11a6 6 0 0 0 12 0M12 19v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {off && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function CameraIcon({ off }: { off?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h8A1.5 1.5 0 0 1 15 7.5v9A1.5 1.5 0 0 1 13.5 18h-8A1.5 1.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 10.2 20 7v10l-5-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {off && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function ScreenShareIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <rect x="3" y="4.5" width="18" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.6" />
      <path d="M8.5 20h7M12 16.5V20" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M12 7.5v5m0-5-2.5 2.5M12 7.5 14.5 10" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function LeaveIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M9 6 4 12l5 6M4 12h13" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M15 6h3.5A1.5 1.5 0 0 1 20 7.5v9a1.5 1.5 0 0 1-1.5 1.5H15" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function PeopleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle cx="9" cy="8" r="3" stroke="currentColor" strokeWidth="1.6" />
      <path d="M3.5 19a5.5 5.5 0 0 1 11 0" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M16 8a3 3 0 1 1 2.2 5M22 19a5 5 0 0 0-4.3-4.95" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ControlButton({
  source,
  onLabel,
  offLabel,
}: {
  source: Track.Source.Microphone | Track.Source.Camera | Track.Source.ScreenShare;
  onLabel: string;
  offLabel: string;
}) {
  const { toggle, enabled, pending } = useTrackToggle({ source });
  const Icon =
    source === Track.Source.Microphone
      ? MicIcon
      : source === Track.Source.Camera
        ? CameraIcon
        : ScreenShareIcon;

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={pending}
      aria-pressed={enabled}
      className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 ${
        enabled
          ? "border-accent bg-accent text-accent-ink"
          : "border-border bg-surface-sunken text-text-muted hover:text-text"
      }`}
    >
      <Icon off={source !== Track.Source.ScreenShare ? !enabled : undefined} />
      {enabled ? onLabel : offLabel}
    </button>
  );
}

function ParticipantRow({
  participant,
  isLocal,
  silencedUntil,
  now,
  onMute,
  muting,
}: {
  participant: Participant;
  isLocal: boolean;
  silencedUntil?: number;
  now: number;
  onMute: (p: RemoteParticipant) => void;
  muting: boolean;
}) {
  const remaining = silencedUntil ? Math.max(0, Math.ceil((silencedUntil - now) / 1000)) : 0;
  const displayName = participant.name || participant.identity;

  return (
    <li className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface-sunken px-4 py-3">
      <span className="text-sm text-text">
        {displayName} {isLocal && <span className="text-text-muted">(você)</span>}
      </span>
      {!isLocal &&
        (remaining > 0 ? (
          <span className="whitespace-nowrap text-xs font-semibold text-text-muted">
            silenciado &middot; {remaining}s
          </span>
        ) : (
          <button
            type="button"
            onClick={() => onMute(participant as RemoteParticipant)}
            disabled={muting}
            className="whitespace-nowrap rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent hover:text-accent disabled:opacity-50"
          >
            Silenciar por 1 min
          </button>
        ))}
    </li>
  );
}

export default function CallUI({
  room,
  mediaWarning,
  onDismissMediaWarning,
}: {
  room: string;
  mediaWarning?: string;
  onDismissMediaWarning?: () => void;
}) {
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  const [panelOpen, setPanelOpen] = useState(false);
  const [alert, setAlert] = useState<SilenceAlert | null>(null);
  const [silencedUntil, setSilencedUntil] = useState<Record<string, number>>({});
  const [mutingId, setMutingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());

  useDataChannel("silence-alert", (msg) => {
    try {
      const data = JSON.parse(new TextDecoder().decode(msg.payload)) as SilenceAlert;
      setAlert(data);
      setSilencedUntil((prev) => ({ ...prev, [data.identity]: data.until }));
    } catch {
      // mensagem em formato inesperado, ignora
    }
  });

  // Atualiza o relógio a cada segundo enquanto houver alguém silenciado, pra
  // contar regressivamente e liberar o botão de silenciar de novo depois.
  useEffect(() => {
    const hasActive = Object.values(silencedUntil).some((until) => until > now);
    if (!hasActive && !alert) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [silencedUntil, alert, now]);

  useEffect(() => {
    if (!alert) return;
    const timer = setTimeout(() => setAlert(null), 6000);
    return () => clearTimeout(timer);
  }, [alert]);

  async function handleMute(target: RemoteParticipant) {
    setMutingId(target.identity);
    try {
      const res = await fetch("/api/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, identity: target.identity, name: target.name || target.identity }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        window.alert(data.error || "Não foi possível silenciar essa pessoa.");
      }
    } finally {
      setMutingId(null);
    }
  }

  return (
    <div className="chatbem-call relative flex h-dvh flex-col bg-bg text-text">
      <RoomAudioRenderer />

      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <span className="font-mono text-xs uppercase tracking-widest text-text-muted">
          Sala &middot; {room}
        </span>
        <span className="text-xs text-text-muted">{participants.length} na chamada</span>
      </div>

      {mediaWarning && (
        <div
          role="status"
          className="flex items-start justify-between gap-3 border-b border-border bg-accent-soft px-4 py-2.5 text-sm text-text"
        >
          <span>{mediaWarning}</span>
          <button
            type="button"
            onClick={onDismissMediaWarning}
            aria-label="Fechar aviso"
            className="shrink-0 text-xs font-semibold text-text-muted hover:text-text"
          >
            Fechar
          </button>
        </div>
      )}

      <div className="min-h-0 flex-1 overflow-hidden p-3">
        <GridLayout tracks={tracks} className="h-full">
          <ParticipantTile />
        </GridLayout>
      </div>

      <div className="flex items-center justify-center gap-3 border-t border-border px-4 py-4">
        <ControlButton source={Track.Source.Microphone} onLabel="Microfone" offLabel="Mudo" />
        <ControlButton source={Track.Source.Camera} onLabel="Câmera" offLabel="Câmera" />
        <ControlButton source={Track.Source.ScreenShare} onLabel="Parar tela" offLabel="Tela" />

        <button
          type="button"
          onClick={() => setPanelOpen((v) => !v)}
          aria-pressed={panelOpen}
          className={`flex flex-col items-center gap-1 rounded-2xl border px-4 py-2.5 text-xs font-semibold transition-colors ${
            panelOpen
              ? "border-accent bg-accent text-accent-ink"
              : "border-border bg-surface-sunken text-text-muted hover:text-text"
          }`}
        >
          <PeopleIcon />
          Pessoas
        </button>

        <DisconnectButton className="flex flex-col items-center gap-1 rounded-2xl border border-border bg-surface-sunken px-4 py-2.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-2 hover:text-accent-2">
          <LeaveIcon />
          Sair
        </DisconnectButton>
      </div>

      {panelOpen && (
        <div className="absolute inset-x-0 bottom-[76px] mx-auto w-full max-w-sm px-3">
          <ul className="flex max-h-[50vh] flex-col gap-2 overflow-y-auto rounded-2xl border border-border bg-surface p-3 shadow-[0_24px_60px_-32px_rgba(20,18,27,0.5)]">
            {participants.map((p) => (
              <ParticipantRow
                key={p.identity}
                participant={p}
                isLocal={p.identity === localParticipant.identity}
                silencedUntil={silencedUntil[p.identity]}
                now={now}
                muting={mutingId === p.identity}
                onMute={handleMute}
              />
            ))}
          </ul>
        </div>
      )}

      {alert && (
        <div
          role="alert"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-6"
          onClick={() => setAlert(null)}
        >
          <div className="max-w-md rounded-[28px] border border-accent bg-surface px-8 py-10 text-center shadow-[0_40px_80px_-24px_rgba(0,0,0,0.6)]">
            <div className="mb-4 text-5xl">🔇</div>
            <p className="font-[family-name:var(--font-display)] text-2xl leading-snug text-text text-balance">
              {alert.message}
            </p>
            <p className="mt-4 text-xs text-text-muted">Toque em qualquer lugar pra fechar</p>
          </div>
        </div>
      )}
    </div>
  );
}
