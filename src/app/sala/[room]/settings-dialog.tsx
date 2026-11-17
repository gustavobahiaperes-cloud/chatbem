"use client";

import { useEffect } from "react";
import { useMediaDeviceSelect } from "@livekit/components-react";

export type Prefs = {
  /** Sons de entrada, saída e mensagem. */
  sounds: boolean;
  /** Apertar para falar: microfone só liga enquanto a tecla está pressionada. */
  ptt: boolean;
};

export const DEFAULT_PREFS: Prefs = { sounds: true, ptt: false };

export const PTT_KEY_LABEL = "Espaço";

const SHORTCUTS: [string, string][] = [
  ["M", "Ligar/desligar microfone"],
  ["V", "Ligar/desligar câmera"],
  ["S", "Compartilhar tela"],
  ["C", "Abrir/fechar chat"],
  ["P", "Abrir/fechar pessoas"],
  [`Segurar ${PTT_KEY_LABEL}`, "Falar (com “apertar para falar” ligado)"],
];

function DeviceSelect({
  kind,
  label,
  onChange,
}: {
  kind: MediaDeviceKind;
  label: string;
  onChange?: (id: string) => void;
}) {
  const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });
  // Saída de áudio só existe em alguns navegadores (Chrome/Edge); nos outros a lista vem vazia.
  // Sem permissão de microfone o navegador também não lista nada.
  if (devices.length === 0) {
    return kind === "audioinput" ? (
      <p className="text-xs leading-relaxed text-text-muted">
        Os aparelhos aparecem aqui depois que o navegador libera o microfone.
      </p>
    ) : null;
  }
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-[11px] font-semibold uppercase tracking-wider text-text-muted">{label}</span>
      <select
        value={activeDeviceId}
        onChange={(e) => {
          const id = e.target.value;
          void setActiveMediaDevice(id);
          onChange?.(id);
        }}
        className="w-full rounded-[10px] border border-border bg-surface-sunken px-3 py-2 text-sm text-text outline-none focus-visible:border-accent-2"
      >
        {devices.map((d) => (
          <option key={d.deviceId} value={d.deviceId}>
            {d.deviceId === "default" ? `Padrão do sistema` : d.label || "Aparelho sem nome"}
          </option>
        ))}
      </select>
    </label>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  hint: string;
}) {
  return (
    <label className="flex cursor-pointer items-start justify-between gap-4">
      <span className="flex flex-col gap-0.5">
        <span className="text-sm font-semibold text-text">{title}</span>
        <span className="text-xs leading-relaxed text-text-muted">{hint}</span>
      </span>
      <input
        type="checkbox"
        role="switch"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="peer sr-only"
      />
      <span
        aria-hidden
        className={`relative mt-0.5 h-6 w-10 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent-2 ${
          checked ? "bg-accent-2" : "bg-border"
        }`}
      >
        <span
          className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
            checked ? "translate-x-[18px]" : "translate-x-0.5"
          }`}
        />
      </span>
    </label>
  );
}

export default function SettingsDialog({
  prefs,
  onPrefsChange,
  onMicChange,
  onClose,
}: {
  prefs: Prefs;
  onPrefsChange: (p: Prefs) => void;
  onMicChange: (id: string) => void;
  onClose: () => void;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Configurações"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90dvh] w-full max-w-md flex-col overflow-hidden rounded-[22px] border border-border bg-surface shadow-[0_40px_80px_-24px_rgba(0,0,0,0.7)]"
      >
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="text-base font-bold text-text">Configurações</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Fechar configurações"
            className="grid h-8 w-8 place-items-center rounded-full text-text-muted transition-colors hover:bg-surface-sunken hover:text-text"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 6l12 12M18 6 6 18" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
          </button>
        </div>

        <div className="flex flex-col gap-6 overflow-y-auto px-5 py-5">
          <section className="flex flex-col gap-3">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Aparelhos</h3>
            <DeviceSelect kind="audioinput" label="Microfone" onChange={onMicChange} />
            <DeviceSelect kind="audiooutput" label="Saída de som (fone ou caixa)" />
            <DeviceSelect kind="videoinput" label="Câmera" />
          </section>

          <section className="flex flex-col gap-4">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Chamada</h3>
            <Toggle
              checked={prefs.ptt}
              onChange={(ptt) => onPrefsChange({ ...prefs, ptt })}
              title="Apertar para falar"
              hint={`O microfone só liga enquanto você segura ${PTT_KEY_LABEL}. Funciona só com esta aba em foco: o navegador não recebe teclas apertadas dentro do jogo.`}
            />
            <Toggle
              checked={prefs.sounds}
              onChange={(sounds) => onPrefsChange({ ...prefs, sounds })}
              title="Sons de aviso"
              hint="Toca um som quando alguém entra, sai ou manda mensagem."
            />
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="font-mono text-[11px] uppercase tracking-wider text-text-muted">Atalhos de teclado</h3>
            <ul className="flex flex-col gap-1.5">
              {SHORTCUTS.map(([key, what]) => (
                <li key={key} className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-text-muted">{what}</span>
                  <kbd className="shrink-0 rounded-md border border-border bg-surface-sunken px-2 py-0.5 font-mono text-xs text-text">
                    {key}
                  </kbd>
                </li>
              ))}
            </ul>
            <p className="pt-1 text-xs text-text-muted">
              Os atalhos não funcionam enquanto você digita no chat.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
