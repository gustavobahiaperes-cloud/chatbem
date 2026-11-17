import { NextRequest, NextResponse } from "next/server";
import { DataPacket_Kind, TrackSource } from "livekit-server-sdk";
import { MISSING_ENV_ERROR, ROOM_RE, roomClient, verifyCaller } from "@/lib/livekit";

const MUTE_SECONDS = 60;
// Cada pessoa só pode silenciar alguém de novo depois deste tempo.
const COOLDOWN_SECONDS = 120;

/**
 * Silencia alguém por 1 minuto. Regras (conferidas aqui no servidor):
 * - quem pede precisa ter um token válido desta sala e estar conectado nela;
 * - não dá para silenciar a si mesmo nem quem já está silenciado;
 * - cada pessoa pode silenciar uma vez a cada 2 minutos.
 * Quem está silenciado e quando silenciou por último ficam nos atributos do participante,
 * que só o servidor consegue alterar. A devolução do microfone é feita por /api/mute/restore.
 */
export async function POST(req: NextRequest) {
  let body: { room?: unknown; identity?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room.trim() : "";
  const identity = typeof body.identity === "string" ? body.identity : "";

  if (!room || !ROOM_RE.test(room)) {
    return NextResponse.json({ error: "Nome de sala inválido." }, { status: 400 });
  }
  if (!identity) {
    return NextResponse.json({ error: "Participante inválido." }, { status: 400 });
  }

  const client = roomClient();
  if (!client) return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 500 });

  const caller = await verifyCaller(req, room);
  if (!caller) {
    return NextResponse.json({ error: "Você não está nesta sala." }, { status: 401 });
  }
  if (caller.identity === identity) {
    return NextResponse.json({ error: "Você não pode silenciar a si mesmo." }, { status: 400 });
  }

  const [me, target] = await Promise.all([
    client.getParticipant(room, caller.identity).catch(() => null),
    client.getParticipant(room, identity).catch(() => null),
  ]);
  if (!me) {
    return NextResponse.json({ error: "Você precisa estar na chamada para silenciar." }, { status: 403 });
  }
  if (!target) {
    return NextResponse.json({ error: "Participante não encontrado na sala." }, { status: 404 });
  }

  const now = Date.now();
  const silencedUntil = Number(target.attributes?.silencedUntil) || 0;
  if (silencedUntil > now) {
    return NextResponse.json({ error: "Essa pessoa já está silenciada." }, { status: 409 });
  }
  const lastSilenceAt = Number(me.attributes?.lastSilenceAt) || 0;
  const wait = Math.ceil((lastSilenceAt + COOLDOWN_SECONDS * 1000 - now) / 1000);
  if (wait > 0) {
    return NextResponse.json(
      { error: `Calma! Você poderá silenciar alguém de novo em ${wait}s.` },
      { status: 429 },
    );
  }

  const until = now + MUTE_SECONDS * 1000;
  const name = target.name || target.identity;

  // Tira o microfone da lista de fontes permitidas: a pessoa não consegue se
  // desmutar sozinha enquanto isso não for revertido.
  await client.updateParticipant(room, identity, {
    permission: {
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canPublishSources: [TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
    },
    attributes: { silencedUntil: String(until) },
  });
  await client.updateParticipant(room, caller.identity, {
    attributes: { lastSilenceAt: String(now) },
  });

  const micTrack = target.tracks.find((t) => t.source === TrackSource.MICROPHONE);
  if (micTrack) {
    await client.mutePublishedTrack(room, identity, micTrack.sid, true).catch(() => {});
  }

  const payload = new TextEncoder().encode(
    JSON.stringify({
      identity,
      name,
      message: `${name} foi silenciado por ${caller.name} por 1 minuto para refletir nos seus atos`,
      until,
    }),
  );
  await client.sendData(room, payload, DataPacket_Kind.RELIABLE, { topic: "silence-alert" });

  return NextResponse.json({ ok: true, until });
}
