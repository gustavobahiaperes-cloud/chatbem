import { NextRequest, NextResponse } from "next/server";
import { ROOM_RE, roomClient } from "@/lib/livekit";

// Quem está na sala agora — usado na tela do nome, antes de entrar.
export async function GET(req: NextRequest) {
  const room = req.nextUrl.searchParams.get("room")?.trim() ?? "";
  if (!ROOM_RE.test(room)) {
    return NextResponse.json({ error: "Nome de sala inválido." }, { status: 400 });
  }

  const client = roomClient();
  if (!client) return NextResponse.json({ count: 0, names: [] });

  // Sala que ainda não existe (ninguém entrou) dá erro na API: tratamos como vazia.
  const participants = await client.listParticipants(room).catch(() => []);
  const names = participants
    .map((p) => p.name || p.identity)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));

  return NextResponse.json({ count: names.length, names });
}
