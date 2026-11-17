import { NextRequest, NextResponse } from "next/server";
import { AccessToken } from "livekit-server-sdk";
import { MISSING_ENV_ERROR, ROOM_RE, livekitEnv } from "@/lib/livekit";

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

  const env = livekitEnv();
  if (!env) {
    return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 500 });
  }

  // canUpdateOwnMetadata fica desligado (padrão): os atributos do participante
  // (ex.: silencedUntil) só podem ser alterados pelo servidor, então dá pra confiar neles.
  const at = new AccessToken(env.apiKey, env.apiSecret, {
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

  return NextResponse.json({ token, url: env.wsUrl });
}
