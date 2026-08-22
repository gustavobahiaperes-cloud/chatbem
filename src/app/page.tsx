"use client";

import Image from "next/image";
import { useRouter } from "next/navigation";
import { useState } from "react";

const DEFAULT_ROOM = "dota+";

function slugify(value: string) {
  return value
    .normalize("NFD")
    .replace(/[^\x00-\x7F]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9+]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export default function Home() {
  const router = useRouter();
  const [room, setRoom] = useState(DEFAULT_ROOM);

  function goToRoom(e: React.FormEvent) {
    e.preventDefault();
    const slug = slugify(room);
    if (slug) router.push(`/sala/${slug}`);
  }

  return (
    <main className="relative flex flex-1 items-center justify-center overflow-hidden px-5 py-12">
      <div className="fixed inset-0 -z-10">
        <Image
          src="/gustavo.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover opacity-75"
        />
      </div>

      <div className="relative z-10 w-full max-w-md flex flex-col gap-8">
        <div className="flex items-center gap-2 self-center rounded-full border border-border bg-surface/85 px-3 py-1.5 font-mono text-xs uppercase tracking-widest text-text-muted shadow-sm backdrop-blur">
          <span className="h-[7px] w-[7px] rounded-full bg-accent shadow-[0_0_0_3px_color-mix(in_srgb,var(--accent)_25%,transparent)]" />
          Sala privada &middot; até 10 pessoas
        </div>

        <div className="rounded-[22px] border border-border bg-surface p-8 shadow-[0_24px_60px_-32px_rgba(20,18,27,0.5)] flex flex-col gap-8">
          <div className="flex flex-col items-center gap-3 text-center">
            <div
              aria-hidden
              className="grid h-[84px] w-[84px] place-items-center rounded-full border border-border"
              style={{
                background:
                  "radial-gradient(circle at 50% 42%, color-mix(in srgb, var(--accent) 55%, var(--surface)) 0%, var(--surface) 72%)",
              }}
            >
              <span
                className="h-[30px] w-[30px] animate-pulse rounded-full bg-accent shadow-[0_0_0_6px_color-mix(in_srgb,var(--accent)_16%,transparent)]"
              />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-[32px] font-normal leading-tight text-balance">
              Chame a galera.
            </h1>
            <p className="max-w-[38ch] text-[15.5px] leading-relaxed text-text-muted">
              Crie uma sala com voz, vídeo e compartilhamento de tela em tempo real. Direto do navegador, sem instalar nada.
            </p>
          </div>

          <form onSubmit={goToRoom} className="flex flex-col gap-4">
            <label className="flex flex-col gap-2">
              <span className="font-mono text-[11px] uppercase tracking-wider text-text-muted">
                Nome da sala
              </span>
              <div className="flex items-center gap-2 rounded-[14px] border border-border bg-surface-sunken px-4 py-3">
                <span className="font-mono text-sm text-text-muted">chatbem.app/sala/</span>
                <input
                  value={room}
                  onChange={(e) => setRoom(e.target.value)}
                  className="min-w-0 flex-1 bg-transparent font-mono text-sm tracking-wide text-text outline-none"
                  maxLength={40}
                  aria-label="Nome da sala"
                />
              </div>
            </label>

            <button
              type="submit"
              className="flex items-center justify-center gap-2 rounded-[14px] bg-accent px-6 py-4 text-base font-bold text-accent-ink shadow-[0_14px_30px_-14px_color-mix(in_srgb,var(--accent)_70%,transparent)] transition-transform hover:-translate-y-px"
            >
              Criar e entrar na sala
            </button>
          </form>
          <p className="text-center text-xs text-text-muted">
            Depois é só mandar o link da sala para os amigos.
          </p>
        </div>

        <div className="flex items-center justify-center gap-2 self-center rounded-full border border-border bg-surface/85 px-3 py-1.5 text-xs text-text-muted shadow-sm backdrop-blur">
          <Image
            src="/gustavo.jpg"
            alt="Gustavo"
            width={96}
            height={96}
            className="h-24 w-24 rounded-full border border-border object-cover"
          />
          <span>Feito por Gustavo, pra galera</span>
        </div>
      </div>
    </main>
  );
}
