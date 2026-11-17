"use client";

import "@livekit/components-styles";
import { LiveKitRoom } from "@livekit/components-react";
import { ConnectionError, DisconnectReason, MediaDeviceFailure } from "livekit-client";
import { useCallback, useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { STORAGE, readStorage, writeStorage } from "@/lib/storage";
import { Avatar } from "./avatar";
import CallUI from "./call-ui";
import MicTest from "./mic-test";

type Stage = "name" | "connecting" | "call" | "error";

function mediaFailureMessage(failure: MediaDeviceFailure | undefined, kind?: MediaDeviceKind) {
  const device =
    kind === "videoinput" ? "a câmera" : kind === "audioinput" ? "o microfone" : "câmera/microfone";
  switch (failure) {
    case MediaDeviceFailure.PermissionDenied:
      return `O navegador bloqueou ${device}. Libere a permissão no cadeado ao lado do endereço e clique no botão de novo.`;
    case MediaDeviceFailure.NotFound:
      return `Não encontramos ${device} neste aparelho. Você continua na chamada mesmo assim.`;
    case MediaDeviceFailure.DeviceInUse:
      return `${device[0].toUpperCase()}${device.slice(1)} está sendo usado por outro programa (Discord, OBS, Zoom...). Feche-o e clique no botão de novo.`;
    default:
      return `Não deu para ligar ${device}. Você continua na chamada e pode tentar de novo pelos botões.`;
  }
}

function disconnectMessage(reason?: DisconnectReason) {
  switch (reason) {
    case DisconnectReason.DUPLICATE_IDENTITY:
      return "Você entrou na sala em outra aba ou aparelho, então esta conexão foi encerrada.";
    case DisconnectReason.PARTICIPANT_REMOVED:
      return "Você foi removido da sala.";
    case DisconnectReason.ROOM_DELETED:
      return "A sala foi encerrada.";
    case DisconnectReason.JOIN_FAILURE:
    case DisconnectReason.SIGNAL_CLOSE:
    case DisconnectReason.STATE_MISMATCH:
      return "A conexão com a chamada caiu. Verifique sua internet e tente entrar de novo.";
    default:
      return `A conexão com a chamada foi encerrada${
        reason !== undefined ? ` (código ${reason})` : ""
      }. Tente entrar de novo.`;
  }
}

// O localStorage não avisa mudanças na mesma aba; só precisamos ler uma vez.
const noSubscribe = () => () => {};

function PresenceStrip({ names }: { names: string[] | null }) {
  if (names === null) return null; // ainda carregando
  if (names.length === 0) {
    return (
      <p className="rounded-[14px] border border-dashed border-border px-4 py-3 text-center text-sm text-text-muted">
        Ninguém na sala ainda. Seja o primeiro!
      </p>
    );
  }
  const shown = names.slice(0, 5);
  const rest = names.length - shown.length;
  return (
    <div className="flex items-center gap-3 rounded-[14px] border border-border bg-surface-sunken px-4 py-3">
      <div className="flex shrink-0 -space-x-2">
        {shown.map((n, i) => (
          <span key={`${n}-${i}`} className="rounded-full ring-2 ring-surface-sunken">
            <Avatar name={n} size={28} />
          </span>
        ))}
      </div>
      <p className="min-w-0 text-sm leading-snug text-text">
        <span className="mr-1.5 inline-block h-2 w-2 rounded-full bg-accent-2 align-middle" />
        <span className="font-semibold">
          {names.length === 1 ? "1 pessoa" : `${names.length} pessoas`} na sala:
        </span>{" "}
        <span className="text-text-muted">
          {shown.join(", ")}
          {rest > 0 && ` e mais ${rest}`}
        </span>
      </p>
    </div>
  );
}

export default function RoomClient({ room }: { room: string }) {
  const [stage, setStage] = useState<Stage>("name");
  // Nome e microfone da última vez neste navegador. useSyncExternalStore lê o
  // localStorage só no navegador (no servidor vem vazio), sem erro de hidratação.
  const savedName = useSyncExternalStore(noSubscribe, () => readStorage(STORAGE.name) ?? "", () => "");
  const savedMic = useSyncExternalStore(noSubscribe, () => readStorage(STORAGE.mic) ?? "", () => "");
  // null = a pessoa ainda não mexeu, então vale o que estava salvo.
  const [typedName, setName] = useState<string | null>(null);
  const [pickedMic, setMicId] = useState<string | null>(null);
  const name = typedName ?? savedName;
  const micId = pickedMic ?? savedMic;
  const [error, setError] = useState("");
  const [token, setToken] = useState("");
  const [serverUrl, setServerUrl] = useState("");
  const [copied, setCopied] = useState(false);
  const [mediaWarning, setMediaWarning] = useState("");
  const [present, setPresent] = useState<string[] | null>(null);

  // Quem já está na sala, atualizado a cada 10s enquanto a pessoa está na tela do nome.
  const onNameScreen = stage !== "call";
  useEffect(() => {
    if (!onNameScreen) return;
    let alive = true;
    const load = () =>
      fetch(`/api/room?room=${encodeURIComponent(room)}`, { cache: "no-store" })
        .then((r) => (r.ok ? r.json() : null))
        .then((data: { names?: string[] } | null) => {
          if (alive && data?.names) setPresent(data.names);
        })
        .catch(() => {});
    load();
    const id = setInterval(load, 10_000);
    return () => {
      alive = false;
      clearInterval(id);
    };
  }, [room, onNameScreen]);

  const changeMic = useCallback((id: string) => {
    setMicId(id);
    writeStorage(STORAGE.mic, id);
  }, []);

  const audioOptions = useMemo(() => (micId ? { deviceId: micId } : true), [micId]);

  async function join(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    writeStorage(STORAGE.name, trimmed);

    setStage("connecting");
    setError("");
    setMediaWarning("");
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
        video={false}
        audio={audioOptions}
        onDisconnected={(reason) => {
          // Saída voluntária (botão Sair) volta para a tela do nome sem mensagem.
          // Qualquer outro motivo mostra o erro em vez de "empurrar" a pessoa de volta em silêncio.
          if (reason === DisconnectReason.CLIENT_INITIATED) {
            setStage((prev) => (prev === "error" ? prev : "name"));
            return;
          }
          setError((prev) => prev || disconnectMessage(reason));
          setStage("error");
        }}
        onMediaDeviceFailure={(failure, kind) => {
          setMediaWarning(mediaFailureMessage(failure, kind));
        }}
        onError={(err) => {
          // Falha de câmera/microfone também chega aqui. Isso não pode derrubar a
          // chamada: a pessoa fica na sala e vê um aviso.
          if (!(err instanceof ConnectionError)) {
            console.warn("[chatbem] falha ao ligar câmera/microfone", err);
            setMediaWarning(
              (prev) => prev || mediaFailureMessage(MediaDeviceFailure.getFailure(err)),
            );
            return;
          }
          setError(`Não deu para conectar na chamada: ${err.message}. Tente de novo em instantes.`);
          setStage("error");
        }}
      >
        <CallUI
          room={room}
          token={token}
          onMicChange={changeMic}
          mediaWarning={mediaWarning}
          onDismissMediaWarning={() => setMediaWarning("")}
        />
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
              O navegador vai pedir permissão para o microfone. A câmera entra desligada: ligue quando quiser.
            </p>
          </div>

          <PresenceStrip names={present} />

          <form onSubmit={join} className="flex flex-col gap-4">
            <input
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Seu nome"
              maxLength={40}
              className="rounded-[14px] border border-border bg-surface-sunken px-4 py-3 text-sm text-text outline-none focus-visible:border-accent-2"
            />
            <MicTest deviceId={micId} onDeviceChange={changeMic} />
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
