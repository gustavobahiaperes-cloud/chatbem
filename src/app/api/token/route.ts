import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";

const ROOM_RE = /^[a-zA-Z0-9_-]{1,64}$/;

export async function POST(req: NextRequest) {
  let body: { room?: unknown; name?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room.trim() : "";
  const name = typeof body.name === "string" ? body.name.trim().slice(0, 40) : "";

  if (!room || !ROOM_RE.test(room)) {
    return NextResponse.json({ error: "Nome de sala inválido." }, { status: 400 });
  }
  if (!name) {
    return NextResponse.json({ error: "Informe um nome." }, { status: 400 });
  }

  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !wsUrl) {
    return NextResponse.json(
      { error: "Servidor sem as variáveis LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL configuradas." },
      { status: 500 },
    );
  }

  const at = new AccessToken(apiKey, apiSecret, {
    identity: `${name}-${Math.random().toString(36).slice(2, 8)}`,
    name,
    ttl: "4h",
  });
  at.addGrant({
    room,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  const token = await at.toJwt();

  return NextResponse.json({ token, url: wsUrl });
}
