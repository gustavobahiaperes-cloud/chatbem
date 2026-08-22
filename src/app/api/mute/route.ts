import { NextRequest, NextResponse } from "next/server";
import { after } from "next/server";
import { DataPacket_Kind, RoomServiceClient, TrackSource } from "livekit-server-sdk";

const MUTE_SECONDS = 60;
const ROOM_RE = /^[a-zA-Z0-9_+-]{1,64}$/;

function getClient() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  const httpUrl = wsUrl.replace(/^ws/, "http");
  return new RoomServiceClient(httpUrl, apiKey, apiSecret);
}

export async function POST(req: NextRequest) {
  let body: { room?: unknown; identity?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room.trim() : "";
  const identity = typeof body.identity === "string" ? body.identity : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 60) : "Alguém";

  if (!room || !ROOM_RE.test(room)) {
    return NextResponse.json({ error: "Nome de sala inválido." }, { status: 400 });
  }
  if (!identity) {
    return NextResponse.json({ error: "Participante inválido." }, { status: 400 });
  }

  const client = getClient();
  if (!client) {
    return NextResponse.json(
      { error: "Servidor sem as variáveis LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL configuradas." },
      { status: 500 },
    );
  }

  const participant = await client.getParticipant(room, identity).catch(() => null);
  if (!participant) {
    return NextResponse.json({ error: "Participante não encontrado na sala." }, { status: 404 });
  }

  // Tira o microfone da lista de fontes permitidas: a pessoa não consegue se
  // desmutar sozinha enquanto isso não for revertido.
  await client.updateParticipant(room, identity, undefined, {
    canPublish: true,
    canPublishData: true,
    canSubscribe: true,
    canPublishSources: [TrackSource.CAMERA, TrackSource.SCREEN_SHARE, TrackSource.SCREEN_SHARE_AUDIO],
  });

  const micTrack = participant.tracks.find((t) => t.source === TrackSource.MICROPHONE);
  if (micTrack) {
    await client.mutePublishedTrack(room, identity, micTrack.sid, true).catch(() => {});
  }

  const until = Date.now() + MUTE_SECONDS * 1000;
  const payload = new TextEncoder().encode(
    JSON.stringify({
      identity,
      name,
      message: `${name} foi silenciado por 1 minuto para refletir nos seus atos`,
      until,
    }),
  );
  await client.sendData(room, payload, DataPacket_Kind.RELIABLE, { topic: "silence-alert" });

  // Depois de 60s, devolve a permissão de publicar áudio.
  after(async () => {
    await new Promise((resolve) => setTimeout(resolve, MUTE_SECONDS * 1000));
    try {
      await client.updateParticipant(room, identity, undefined, {
        canPublish: true,
        canPublishData: true,
        canSubscribe: true,
        canPublishSources: [],
      });
    } catch {
      // sala ou participante já pode não existir mais nesse ponto — ok ignorar
    }
  });

  return NextResponse.json({ ok: true, until });
}
