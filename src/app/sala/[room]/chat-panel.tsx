"use client";

import { Fragment, useEffect, useRef, useState } from "react";
import type { ReceivedChatMessage } from "@livekit/components-react";
import { Avatar, displayNameOf, nameColor } from "./avatar";

const MAX_LENGTH = 500;
// Mensagens seguidas da mesma pessoa em até 5 min ficam no mesmo bloco.
const GROUP_WINDOW_MS = 5 * 60 * 1000;
const URL_RE = /(https?:\/\/[^\s<]+[^\s<.,;:!?)\]'"])/g;

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

// Transforma links em <a> clicáveis; o resto continua texto puro (o React escapa).
function Linkified({ text }: { text: string }) {
  const parts = text.split(URL_RE);
  return (
    <>
      {parts.map((part, i) =>
        i % 2 === 1 ? (
          <a
            key={i}
            href={part}
            target="_blank"
            rel="noopener noreferrer"
            className="break-all text-accent-2 underline decoration-dotted underline-offset-2 hover:decoration-solid"
          >
            {part}
          </a>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </>
  );
}

function SendIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path d="M4 12 20 4l-5 16-3-7-8-1Z" stroke="currentColor" strokeWidth="1.7" strokeLinejoin="round" />
      <path d="m12 13 8-9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
    </svg>
  );
}

export default function ChatPanel({
  messages,
  send,
  isSending,
  localIdentity,
}: {
  messages: ReceivedChatMessage[];
  send: (text: string) => Promise<unknown>;
  isSending: boolean;
  localIdentity: string;
}) {
  const [draft, setDraft] = useState("");
  const [sendError, setSendError] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const stickToBottom = useRef(true);

  // Desce para a última mensagem, a não ser que a pessoa tenha rolado para cima para ler.
  useEffect(() => {
    const el = listRef.current;
    if (el && stickToBottom.current) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  function onScroll() {
    const el = listRef.current;
    if (!el) return;
    stickToBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 60;
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || isSending) return;
    setSendError("");
    stickToBottom.current = true;
    try {
      await send(text);
      setDraft("");
    } catch {
      setSendError("Não deu para enviar. Tente de novo.");
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={listRef}
        onScroll={onScroll}
        className="min-h-0 flex-1 overflow-y-auto px-3 py-3"
        aria-live="polite"
      >
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 px-4 text-center">
            <p className="text-sm font-semibold text-text">Nenhuma mensagem ainda</p>
            <p className="text-[12.5px] leading-relaxed text-text-muted">
              Mande um oi! As mensagens aparecem só para quem está na sala agora e somem quando
              você sai.
            </p>
          </div>
        ) : (
          <ol className="flex flex-col">
            {messages.map((m, i) => {
              const prev = messages[i - 1];
              const sender = m.from ? displayNameOf(m.from) : "Alguém";
              const senderId = m.from?.identity ?? "";
              const grouped =
                !!prev &&
                (prev.from?.identity ?? "") === senderId &&
                m.timestamp - prev.timestamp < GROUP_WINDOW_MS;
              const isMe = senderId === localIdentity;

              return (
                <li
                  key={m.id}
                  className={`group flex gap-2.5 rounded-lg px-1.5 hover:bg-surface-sunken/60 ${
                    grouped ? "py-0.5" : "mt-2.5 py-1 first:mt-0"
                  }`}
                >
                  <div className="w-8 shrink-0">
                    {grouped ? (
                      <span className="block pt-0.5 text-right font-mono text-[9.5px] text-text-muted opacity-0 group-hover:opacity-100">
                        {formatTime(m.timestamp)}
                      </span>
                    ) : (
                      <Avatar name={sender} size={32} />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    {!grouped && (
                      <div className="flex items-baseline gap-2">
                        <span className="truncate text-[13.5px] font-semibold" style={{ color: nameColor(sender) }}>
                          {sender}
                          {isMe && <span className="font-normal text-text-muted"> (você)</span>}
                        </span>
                        <span className="shrink-0 font-mono text-[10.5px] text-text-muted">
                          {formatTime(m.timestamp)}
                        </span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap break-words text-[14px] leading-snug text-text">
                      <Linkified text={m.message} />
                    </p>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>

      <form onSubmit={submit} className="border-t border-border p-3">
        {sendError && <p className="pb-2 text-xs text-danger">{sendError}</p>}
        <div className="flex items-end gap-2 rounded-xl border border-border bg-surface-sunken px-3 py-2 focus-within:border-accent-2">
          <textarea
            autoFocus
            rows={1}
            value={draft}
            maxLength={MAX_LENGTH}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Enter envia; Shift+Enter quebra a linha.
              if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
                e.preventDefault();
                e.currentTarget.form?.requestSubmit();
              }
            }}
            placeholder="Mensagem para a sala"
            aria-label="Mensagem para a sala"
            className="max-h-32 min-h-[22px] flex-1 resize-none bg-transparent text-sm text-text outline-none placeholder:text-text-muted [field-sizing:content]"
          />
          <button
            type="submit"
            disabled={!draft.trim() || isSending}
            aria-label="Enviar mensagem"
            className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent text-accent-ink transition-opacity disabled:opacity-30"
          >
            <SendIcon />
          </button>
        </div>
        {draft.length > MAX_LENGTH - 80 && (
          <p className="pt-1.5 text-right font-mono text-[10.5px] text-text-muted">
            {draft.length}/{MAX_LENGTH}
          </p>
        )}
      </form>
    </div>
  );
}
