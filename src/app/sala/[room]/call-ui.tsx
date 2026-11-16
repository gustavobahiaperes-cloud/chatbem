"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ConnectionQuality, RoomEvent, Track } from "livekit-client";
import {
  GridLayout,
  ParticipantTile,
  RoomAudioRenderer,
  useChat,
  useConnectionQualityIndicator,
  useDataChannel,
  useIsSpeaking,
  useLocalParticipant,
  useParticipants,
  useRoomContext,
  useTracks,
  useTrackToggle,
} from "@livekit/components-react";
import type { Participant, RemoteParticipant } from "livekit-client";
import { Avatar, displayNameOf } from "./avatar";
import ChatPanel from "./chat-panel";

// A partir desta largura, chat e lista de pessoas cabem lado a lado sem espremer o vídeo.
const ROOMY = "(min-width: 1100px)";

function matches(query: string) {
  return window.matchMedia(query).matches;
}

type SilenceAlert = {
  identity: string;
  name: string;
  message: string;
  until: number;
};

type Toast = { id: number; text: string };

const VOLUME_KEY = "chatbem:volumes";

/* ---------- Ícones ---------- */

function MicIcon({ off, size = 20 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 0 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M6 11a6 6 0 0 0 12 0M12 19v3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      {off && <path d="M4 4l16 16" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function CameraIcon({ off, size = 20 }: { off?: boolean; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 7.5A1.5 1.5 0 0 1 5.5 6h8A1.5 1.5 0 0 1 15 7.5v9A1.5 1.5 0 0 1 13.5 18h-8A1.5 1.5 0 0 1 4 16.5v-9Z" stroke="currentColor" strokeWidth="1.6" />
      <path d="M15 10.2 20 7v10l-5-3.2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
      {off && <path d="M3 3l18 18" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />}
    </svg>
  );
}

function ScreenShareIcon({ size = 20 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
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

function LinkIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M10 14a4 4 0 0 0 5.66 0l3-3a4 4 0 0 0-5.66-5.66l-1 1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M14 10a4 4 0 0 0-5.66 0l-3 3a4 4 0 0 0 5.66 5.66l1-1" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function ChatIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5.5A1.5 1.5 0 0 1 6.5 4h11A1.5 1.5 0 0 1 19 5.5v9a1.5 1.5 0 0 1-1.5 1.5H10l-4.2 3.5a.5.5 0 0 1-.8-.4V5.5Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path d="M8.5 9h7M8.5 12h4.5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
    </svg>
  );
}

function CloseIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
    </svg>
  );
}

function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
      className={`transition-transform ${open ? "rotate-180" : ""}`}
    >
      <path d="m6 9 6 6 6-6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function PanelHeader({
  title,
  count,
  onClose,
  closeLabel,
}: {
  title: string;
  count?: number;
  onClose: () => void;
  closeLabel: string;
}) {
  return (
    <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
      <h2 className="text-sm font-bold text-text">
        {title}
        {count !== undefined && (
          <span className="ml-2 font-mono text-xs font-normal text-text-muted">{count}</span>
        )}
      </h2>
      <button
        type="button"
        onClick={onClose}
        aria-label={closeLabel}
        className="grid h-7 w-7 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
      >
        <CloseIcon />
      </button>
    </div>
  );
}

/* ---------- Utilidades ---------- */

function loadVolumes(): Record<string, number> {
  try {
    const raw = localStorage.getItem(VOLUME_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function saveVolumes(volumes: Record<string, number>) {
  try {
    localStorage.setItem(VOLUME_KEY, JSON.stringify(volumes));
  } catch {
    // armazenamento bloqueado (aba anônima etc.) — só não lembra o volume
  }
}

/* ---------- Componentes ---------- */

function SignalBars({ participant }: { participant: Participant }) {
  const { quality } = useConnectionQualityIndicator({ participant });
  const level =
    quality === ConnectionQuality.Excellent
      ? 3
      : quality === ConnectionQuality.Good
        ? 2
        : quality === ConnectionQuality.Poor
          ? 1
          : 0;
  const label =
    level === 3
      ? "Conexão ótima"
      : level === 2
        ? "Conexão boa"
        : level === 1
          ? "Conexão ruim"
          : quality === ConnectionQuality.Lost
            ? "Conexão perdida"
            : "Conexão desconhecida";
  const on = level === 1 ? "bg-accent" : "bg-accent-2";

  return (
    <span title={label} aria-label={label} className="flex h-3 items-end gap-[2px]">
      {[1, 2, 3].map((i) => (
        <span
          key={i}
          className={`w-[3px] rounded-sm ${i <= level ? on : "bg-border"}`}
          style={{ height: `${i * 4}px` }}
        />
      ))}
    </span>
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
  const isScreen = source === Track.Source.ScreenShare;

  // Microfone/câmera: neutro quando ligado, vermelho quando desligado.
  // Tela: verde enquanto está compartilhando.
  const look = isScreen
    ? enabled
      ? "border-accent-2/50 bg-accent-2/15 text-accent-2"
      : "border-border bg-surface-sunken text-text-muted hover:text-text"
    : enabled
      ? "border-border bg-surface-sunken text-text hover:bg-border"
      : "border-danger/40 bg-danger/15 text-danger hover:bg-danger/25";

  return (
    <button
      type="button"
      onClick={() => toggle()}
      disabled={pending}
      aria-pressed={enabled}
      className={`flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors disabled:opacity-50 sm:px-4 ${look}`}
    >
      <Icon off={source !== Track.Source.ScreenShare ? !enabled : undefined} />
      {enabled ? onLabel : offLabel}
    </button>
  );
}

function MemberRow({
  participant,
  isLocal,
  silencedUntil,
  now,
  expanded,
  onToggle,
  volume,
  onVolume,
  onMute,
  muting,
}: {
  participant: Participant;
  isLocal: boolean;
  silencedUntil?: number;
  now: number;
  expanded: boolean;
  onToggle: () => void;
  volume: number;
  onVolume: (v: number) => void;
  onMute: (p: RemoteParticipant) => void;
  muting: boolean;
}) {
  const speaking = useIsSpeaking(participant);
  const name = displayNameOf(participant);
  const remaining = silencedUntil ? Math.max(0, Math.ceil((silencedUntil - now) / 1000)) : 0;
  const micOn = participant.isMicrophoneEnabled;
  const camOn = participant.isCameraEnabled;
  const sharing = participant.isScreenShareEnabled;

  let status: { text: string; className: string };
  if (remaining > 0) status = { text: `silenciado · ${remaining}s`, className: "text-danger" };
  else if (speaking) status = { text: "falando", className: "text-accent-2" };
  else if (sharing) status = { text: "compartilhando a tela", className: "text-text-muted" };
  else if (camOn) status = { text: "câmera ligada", className: "text-text-muted" };
  else if (!micOn) status = { text: "microfone desligado", className: "text-text-muted" };
  else status = { text: "só voz", className: "text-text-muted" };

  const rowContent = (
    <>
      <Avatar name={name} speaking={speaking} />
      <span className="min-w-0 flex-1">
        <span className="flex items-baseline gap-1.5">
          <span className={`truncate text-sm font-semibold ${speaking ? "text-text" : "text-text/90"}`}>
            {name}
          </span>
          {isLocal && <span className="shrink-0 text-xs text-text-muted">(você)</span>}
        </span>
        <span className={`block truncate text-[11.5px] ${status.className}`}>{status.text}</span>
      </span>
      <span className="flex shrink-0 items-center gap-1.5 text-text-muted">
        {sharing && (
          <span title="Compartilhando a tela" className="text-accent-2">
            <ScreenShareIcon size={15} />
          </span>
        )}
        {camOn && (
          <span title="Câmera ligada">
            <CameraIcon size={15} />
          </span>
        )}
        {!micOn && (
          <span title="Microfone desligado" className="text-danger">
            <MicIcon off size={15} />
          </span>
        )}
        <SignalBars participant={participant} />
        {!isLocal && <ChevronIcon open={expanded} />}
      </span>
    </>
  );

  return (
    <li>
      {isLocal ? (
        <div className="flex items-center gap-3 rounded-xl px-2 py-2">{rowContent}</div>
      ) : (
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={expanded}
          className={`flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-surface-sunken ${
            expanded ? "bg-surface-sunken" : ""
          }`}
        >
          {rowContent}
        </button>
      )}

      {!isLocal && expanded && (
        <div className="mx-2 mb-2 mt-1 flex flex-col gap-3 rounded-xl border border-border bg-surface-sunken p-3">
          <label className="flex flex-col gap-1.5">
            <span className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-wider text-text-muted">
              Volume para você
              <span className="font-mono normal-case tracking-normal text-text">{volume}%</span>
            </span>
            <input
              type="range"
              min={0}
              max={100}
              step={5}
              value={volume}
              onChange={(e) => onVolume(Number(e.target.value))}
              className="w-full accent-[var(--accent)]"
              aria-label={`Volume de ${name}`}
            />
          </label>
          {remaining > 0 ? (
            <p className="text-center text-xs text-text-muted">Silenciado por mais {remaining}s</p>
          ) : (
            <button
              type="button"
              onClick={() => onMute(participant as RemoteParticipant)}
              disabled={muting}
              className="rounded-lg border border-border bg-surface px-3 py-2 text-xs font-semibold text-text-muted transition-colors hover:border-danger hover:text-danger disabled:opacity-50"
            >
              {muting ? "Silenciando..." : "Silenciar por 1 min"}
            </button>
          )}
        </div>
      )}
    </li>
  );
}

/* ---------- Tela da chamada ---------- */

export default function CallUI({
  room,
  mediaWarning,
  onDismissMediaWarning,
}: {
  room: string;
  mediaWarning?: string;
  onDismissMediaWarning?: () => void;
}) {
  const lkRoom = useRoomContext();
  const tracks = useTracks([
    { source: Track.Source.Camera, withPlaceholder: true },
    { source: Track.Source.ScreenShare, withPlaceholder: false },
  ]);
  const participants = useParticipants();
  const { localParticipant } = useLocalParticipant();

  // Esta tela só existe depois que a pessoa clica em "Entrar", então window já existe.
  // Pessoas abre sozinho a partir de tablet; o chat também abre em telas largas.
  const [showPeople, setShowPeople] = useState(() => matches("(min-width: 768px)"));
  const [showChat, setShowChat] = useState(() => matches("(min-width: 1280px)"));
  const { chatMessages, send, isSending } = useChat();
  // Quantas mensagens já tinham chegado da última vez que o chat esteve visível.
  const [seenCount, setSeenCount] = useState(0);
  const chatVisible = showChat;
  const unread = chatVisible ? 0 : chatMessages.length - seenCount;
  const lastToasted = useRef(0);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [alert, setAlert] = useState<SilenceAlert | null>(null);
  const [silencedUntil, setSilencedUntil] = useState<Record<string, number>>({});
  const [mutingId, setMutingId] = useState<string | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [volumes, setVolumes] = useState<Record<string, number>>(loadVolumes);
  const [copied, setCopied] = useState(false);
  const toastId = useRef(0);

  const pushToast = useCallback((text: string) => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev.slice(-2), { id, text }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  }, []);

  // Avisos de quem entrou e saiu.
  useEffect(() => {
    const onJoin = (p: RemoteParticipant) => pushToast(`${displayNameOf(p)} entrou na sala`);
    const onLeave = (p: RemoteParticipant) => pushToast(`${displayNameOf(p)} saiu da sala`);
    lkRoom.on(RoomEvent.ParticipantConnected, onJoin);
    lkRoom.on(RoomEvent.ParticipantDisconnected, onLeave);
    return () => {
      lkRoom.off(RoomEvent.ParticipantConnected, onJoin);
      lkRoom.off(RoomEvent.ParticipantDisconnected, onLeave);
    };
  }, [lkRoom, pushToast]);

  // Mostra um aviso rápido quando chega mensagem e o chat está fechado.
  useEffect(() => {
    const fresh = chatMessages.slice(lastToasted.current);
    lastToasted.current = chatMessages.length;
    if (chatVisible) return;
    for (const m of fresh) {
      if (!m.from || m.from.identity === localParticipant.identity) continue;
      const preview = m.message.length > 60 ? `${m.message.slice(0, 60)}…` : m.message;
      pushToast(`${displayNameOf(m.from)}: ${preview}`);
    }
  }, [chatMessages, chatVisible, localParticipant.identity, pushToast]);

  // Chat e Pessoas abrem lado a lado quando a tela é larga. Em telas menores
  // (celular, tablet, janela estreita) só cabe uma coluna, então abrir uma fecha a outra.
  // Ao abrir ou fechar o chat, guarda até onde foi lido para o contador de não lidas.
  function toggleChat() {
    const next = !showChat;
    setSeenCount(chatMessages.length);
    if (next && !matches(ROOMY)) setShowPeople(false);
    setShowChat(next);
  }

  function togglePeople() {
    const next = !showPeople;
    if (next && showChat && !matches(ROOMY)) {
      setSeenCount(chatMessages.length);
      setShowChat(false);
    }
    setShowPeople(next);
  }

  function closeAll() {
    if (showChat) setSeenCount(chatMessages.length);
    setShowChat(false);
    setShowPeople(false);
  }

  // Aplica o volume salvo (por nome) a cada pessoa, inclusive quem entrar depois.
  useEffect(() => {
    for (const p of participants) {
      if (p.identity === localParticipant.identity) continue;
      const v = volumes[displayNameOf(p)];
      (p as RemoteParticipant).setVolume((v ?? 100) / 100);
    }
  }, [participants, volumes, localParticipant.identity]);

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

  function setVolumeFor(name: string, v: number) {
    setVolumes((prev) => {
      const next = { ...prev, [name]: v };
      saveVolumes(next);
      return next;
    });
  }

  function copyLink() {
    navigator.clipboard
      .writeText(window.location.href)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1800);
      })
      .catch(() => pushToast("Não deu para copiar o link. Copie da barra de endereço."));
  }

  async function handleMute(target: RemoteParticipant) {
    setMutingId(target.identity);
    try {
      const res = await fetch("/api/mute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ room, identity: target.identity, name: displayNameOf(target) }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        pushToast(data.error || "Não foi possível silenciar essa pessoa.");
      }
    } catch {
      pushToast("Não foi possível silenciar essa pessoa.");
    } finally {
      setMutingId(null);
    }
  }

  // Você primeiro, depois todo mundo em ordem alfabética.
  const sorted = [...participants].sort((a, b) => {
    if (a.identity === localParticipant.identity) return -1;
    if (b.identity === localParticipant.identity) return 1;
    return displayNameOf(a).localeCompare(displayNameOf(b), "pt-BR");
  });

  return (
    <div className="chatbem-call relative flex h-dvh overflow-hidden bg-bg text-text">
      <RoomAudioRenderer />

      {/* Área principal */}
      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <div className="flex min-w-0 items-center gap-2">
            <span className="h-[7px] w-[7px] shrink-0 rounded-full bg-accent-2 shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent-2)_25%,transparent)]" />
            <span className="truncate font-mono text-xs uppercase tracking-widest text-text-muted">
              Sala &middot; {room}
            </span>
          </div>
          <button
            type="button"
            onClick={copyLink}
            className="flex shrink-0 items-center gap-1.5 rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-2 hover:text-accent-2"
          >
            <LinkIcon />
            {copied ? "Link copiado!" : "Convidar"}
          </button>
        </header>

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

        <div className="relative min-h-0 flex-1 overflow-hidden p-3">
          <GridLayout tracks={tracks} className="h-full">
            <ParticipantTile />
          </GridLayout>

          {toasts.length > 0 && (
            <div className="pointer-events-none absolute inset-x-0 top-4 z-20 flex flex-col items-center gap-2 px-4">
              {toasts.map((t) => (
                <div
                  key={t.id}
                  role="status"
                  className="rounded-full border border-border bg-surface/95 px-4 py-2 text-sm text-text shadow-[0_12px_30px_-16px_rgba(0,0,0,0.6)] backdrop-blur"
                >
                  {t.text}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-2 border-t border-border px-3 py-3 sm:gap-3 sm:py-4">
          <ControlButton source={Track.Source.Microphone} onLabel="Microfone" offLabel="Mudo" />
          <ControlButton source={Track.Source.Camera} onLabel="Câmera" offLabel="Câmera" />
          <ControlButton source={Track.Source.ScreenShare} onLabel="Parar tela" offLabel="Tela" />

          <button
            type="button"
            onClick={togglePeople}
            aria-pressed={showPeople}
            className={`relative flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors sm:px-4 ${
              showPeople
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border bg-surface-sunken text-text-muted hover:text-text"
            }`}
          >
            <PeopleIcon />
            Pessoas
            <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-surface-sunken px-1 font-mono text-[10px] text-text ring-1 ring-border">
              {participants.length}
            </span>
          </button>

          <button
            type="button"
            onClick={toggleChat}
            aria-pressed={showChat}
            aria-label={unread > 0 ? `Chat, ${unread} mensagens novas` : "Chat"}
            className={`relative flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border px-3 py-2.5 text-xs font-semibold transition-colors sm:px-4 ${
              showChat
                ? "border-accent/50 bg-accent/15 text-accent"
                : "border-border bg-surface-sunken text-text-muted hover:text-text"
            }`}
          >
            <ChatIcon />
            Chat
            {unread > 0 && (
              <span className="absolute -right-1.5 -top-1.5 grid h-5 min-w-5 place-items-center rounded-full bg-danger px-1 font-mono text-[10px] font-bold text-white">
                {unread > 99 ? "99+" : unread}
              </span>
            )}
          </button>

          {/* Botão próprio em vez do DisconnectButton: o CSS do LiveKit sobrescrevia as cores. */}
          <button
            type="button"
            onClick={() => lkRoom.disconnect()}
            className="flex min-w-[64px] flex-col items-center gap-1 rounded-2xl border border-danger bg-danger px-3 py-2.5 text-xs font-semibold text-white transition-[filter] hover:brightness-110 sm:px-4"
          >
            <LeaveIcon />
            Sair
          </button>
        </div>
      </section>

      {/* Celular: fundo escuro atrás da gaveta aberta */}
      {(showChat || showPeople) && (
        <div aria-hidden onClick={closeAll} className="fixed inset-0 z-30 bg-black/50 md:hidden" />
      )}

      {/* Chat: coluna própria no computador, gaveta no celular */}
      {showChat && (
        <aside
          aria-label="Chat da sala"
          className="fixed inset-y-0 right-0 z-40 flex w-[min(360px,92vw)] flex-col border-l border-border bg-surface md:static md:z-auto md:w-80"
        >
          <PanelHeader title="Chat" onClose={toggleChat} closeLabel="Fechar chat" />
          <ChatPanel
            messages={chatMessages}
            send={send}
            isSending={isSending}
            localIdentity={localParticipant.identity}
          />
        </aside>
      )}

      {/* Quem está online: coluna à direita, ao lado do chat */}
      {showPeople && (
        <aside
          aria-label="Pessoas na chamada"
          className="fixed inset-y-0 right-0 z-40 flex w-[min(320px,88vw)] flex-col border-l border-border bg-[color-mix(in_srgb,var(--surface)_65%,var(--bg))] md:static md:z-auto md:w-64"
        >
          <PanelHeader
            title="Pessoas"
            count={participants.length}
            onClose={togglePeople}
            closeLabel="Fechar lista de pessoas"
          />
          <div className="min-h-0 flex-1 overflow-y-auto px-2 pb-3">
            <p className="px-2 pb-1 pt-3 font-mono text-[11px] uppercase tracking-wider text-text-muted">
              Na chamada &mdash; {participants.length}
            </p>
            <ul className="flex flex-col gap-0.5">
              {sorted.map((p) => {
                const isLocal = p.identity === localParticipant.identity;
                const name = displayNameOf(p);
                return (
                  <MemberRow
                    key={p.identity}
                    participant={p}
                    isLocal={isLocal}
                    silencedUntil={silencedUntil[p.identity]}
                    now={now}
                    expanded={expanded === p.identity}
                    onToggle={() => setExpanded((cur) => (cur === p.identity ? null : p.identity))}
                    volume={volumes[name] ?? 100}
                    onVolume={(v) => setVolumeFor(name, v)}
                    onMute={handleMute}
                    muting={mutingId === p.identity}
                  />
                );
              })}
            </ul>
            {participants.length > 1 && (
              <p className="px-2 pt-3 text-[11.5px] leading-relaxed text-text-muted">
                Clique em alguém para ajustar o volume ou silenciar.
              </p>
            )}
          </div>

          <div className="border-t border-border p-3">
            <button
              type="button"
              onClick={copyLink}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-bold text-accent-ink transition-transform hover:-translate-y-px"
            >
              <LinkIcon />
              {copied ? "Link copiado!" : "Copiar link da sala"}
            </button>
          </div>
        </aside>
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
