"use client";

import { useEffect, useState } from "react";

/**
 * Teste de microfone antes de entrar: escolhe o aparelho e mostra uma barra que
 * se mexe com a voz. O aparelho escolhido é usado ao entrar na chamada.
 */
export default function MicTest({
  deviceId,
  onDeviceChange,
}: {
  deviceId: string;
  onDeviceChange: (id: string) => void;
}) {
  const [testing, setTesting] = useState(false);
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [level, setLevel] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!testing) return;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let ctx: AudioContext | null = null;
    let raf = 0;

    (async () => {
      try {
        setError("");
        stream = await navigator.mediaDevices.getUserMedia({
          audio: deviceId ? { deviceId: { exact: deviceId } } : true,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        // Os nomes dos aparelhos só aparecem depois que a permissão é dada.
        const list = (await navigator.mediaDevices.enumerateDevices()).filter(
          (d) => d.kind === "audioinput" && d.deviceId,
        );
        setDevices(list);

        ctx = new AudioContext();
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 512;
        ctx.createMediaStreamSource(stream).connect(analyser);
        const data = new Uint8Array(analyser.fftSize);
        const tick = () => {
          analyser.getByteTimeDomainData(data);
          let sum = 0;
          for (const v of data) {
            const x = (v - 128) / 128;
            sum += x * x;
          }
          setLevel(Math.min(1, Math.sqrt(sum / data.length) * 5));
          raf = requestAnimationFrame(tick);
        };
        tick();
      } catch (err) {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : "";
        if (deviceId && (name === "OverconstrainedError" || name === "NotFoundError")) {
          // O aparelho salvo não existe mais (fone desconectado etc.): volta pro padrão.
          onDeviceChange("");
          return;
        }
        setError(
          name === "NotAllowedError"
            ? "O navegador bloqueou o microfone. Libere no cadeado ao lado do endereço."
            : name === "NotFoundError"
              ? "Nenhum microfone encontrado."
              : name === "NotReadableError"
                ? "O microfone está sendo usado por outro programa."
                : "Não deu para abrir o microfone.",
        );
        setTesting(false);
      }
    })();

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      stream?.getTracks().forEach((t) => t.stop());
      ctx?.close().catch(() => {});
    };
  }, [testing, deviceId, onDeviceChange]);

  const bars = 16;
  const lit = Math.round(level * bars);

  return (
    <div className="flex flex-col gap-3 rounded-[14px] border border-border bg-surface-sunken p-3.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-semibold text-text">Microfone</span>
        <button
          type="button"
          onClick={() => setTesting((v) => !v)}
          className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold text-text-muted transition-colors hover:border-accent-2 hover:text-accent-2"
        >
          {testing ? "Parar teste" : "Testar microfone"}
        </button>
      </div>

      {testing && (
        <>
          {devices.length > 0 && (
            <select
              value={deviceId}
              onChange={(e) => onDeviceChange(e.target.value)}
              aria-label="Escolher microfone"
              className="w-full rounded-[10px] border border-border bg-surface px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-2"
            >
              <option value="">Padrão do sistema</option>
              {devices.map((d) => (
                <option key={d.deviceId} value={d.deviceId}>
                  {d.label || "Microfone sem nome"}
                </option>
              ))}
            </select>
          )}
          <div className="flex h-4 items-end gap-[3px]" aria-hidden>
            {Array.from({ length: bars }, (_, i) => (
              <span
                key={i}
                className={`h-full flex-1 rounded-sm transition-colors duration-75 ${
                  i < lit ? (i > bars * 0.8 ? "bg-accent" : "bg-accent-2") : "bg-border"
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-text-muted">Fale algo: a barra deve se mexer.</p>
        </>
      )}

      {error && <p className="text-xs text-danger">{error}</p>}
    </div>
  );
}
