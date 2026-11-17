import { NextRequest, NextResponse } from "next/server";
import { ROOM_RE, verifyCaller } from "@/lib/livekit";
import { historyEnabled, loadHistory, saveMessage } from "@/lib/history";

const MAX_LENGTH = 500;

// Histórico do chat: só quem tem um token válido desta sala lê ou grava.

export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room")?.trim() ?? "";
  if (!ROOM_RE.test(room)) {
    return NextResponse.json({ error: "Nome de sala inválido." }, { status: 400 });
  }
  if (!(await verifyCaller(req, room))) {
    return NextResponse.json({ error: "Você não está nesta sala." }, { status: 401 });
  }
  if (!historyEnabled()) return NextResponse.json({ enabled: false, messages: [] });

  try {
    return NextResponse.json({ enabled: true, messages: await loadHistory(room) });
  } catch (err) {
    console.error("[chat] falha ao ler histórico", err);
    return NextResponse.json({ enabled: true, messages: [] });
  }
}

export async function POST(req: NextRequest) {
  let body: { room?: unknown; id?: unknown; message?: unknown; timestamp?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Corpo da requisição inválido." }, { status: 400 });
  }

  const room = typeof body.room === "string" ? body.room.trim() : "";
  const id = typeof body.id === "string" ? body.id.slice(0, 64) : "";
  const message = typeof body.message === "string" ? body.message.trim().slice(0, MAX_LENGTH) : "";
  if (!ROOM_RE.test(room) || !id || !message) {
    return NextResponse.json({ error: "Mensagem inválida." }, { status: 400 });
  }

  // Nome e identidade vêm do token, não do corpo: ninguém manda mensagem em nome de outro.
  const caller = await verifyCaller(req, room);
  if (!caller) {
    return NextResponse.json({ error: "Você não está nesta sala." }, { status: 401 });
  }
  if (!historyEnabled()) return NextResponse.json({ enabled: false });

  // Usa o horário do remetente (para bater com quem viu ao vivo), mas não aceita horário maluco.
  const now = Date.now();
  const sent = typeof body.timestamp === "number" ? body.timestamp : now;
  const timestamp = Math.abs(sent - now) < 5 * 60 * 1000 ? sent : now;

  try {
    await saveMessage(room, { id, timestamp, message, identity: caller.identity, name: caller.name });
    return NextResponse.json({ enabled: true, ok: true });
  } catch (err) {
    console.error("[chat] falha ao salvar mensagem", err);
    return NextResponse.json({ error: "Não deu para salvar a mensagem." }, { status: 502 });
  }
}
