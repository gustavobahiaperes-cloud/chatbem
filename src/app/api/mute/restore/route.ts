import { NextRequest, NextResponse } from "next/server";
import { MISSING_ENV_ERROR, ROOM_RE, roomClient, verifyCaller } from "@/lib/livekit";

// Margem para diferença de relógio entre o navegador e o servidor.
const CLOCK_SLACK_MS = 2000;

/**
 * Devolve o microfone de quem foi silenciado, depois que o minuto acabou.
 * Qualquer pessoa da sala pode pedir (os navegadores pedem sozinhos quando a contagem
 * zera); o servidor só libera se o horário salvo em "silencedUntil" já passou.
 * Isso substitui a espera de 60s dentro da função, que a Vercel podia interromper.
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
  if (!ROOM_RE.test(room) || !identity) {
    return NextResponse.json({ error: "Dados inválidos." }, { status: 400 });
  }

  const client = roomClient();
  if (!client) return NextResponse.json({ error: MISSING_ENV_ERROR }, { status: 500 });

  if (!(await verifyCaller(req, room))) {
    return NextResponse.json({ error: "Você não está nesta sala." }, { status: 401 });
  }

  const target = await client.getParticipant(room, identity).catch(() => null);
  if (!target) return NextResponse.json({ ok: true, restored: false });

  const until = Number(target.attributes?.silencedUntil) || 0;
  if (!until) return NextResponse.json({ ok: true, restored: false });
  if (Date.now() + CLOCK_SLACK_MS < until) {
    return NextResponse.json({ error: "Ainda não acabou o tempo." }, { status: 425 });
  }

  await client.updateParticipant(room, identity, {
    permission: {
      canPublish: true,
      canPublishData: true,
      canSubscribe: true,
      canPublishSources: [],
    },
    attributes: { silencedUntil: "" },
  });

  return NextResponse.json({ ok: true, restored: true });
}
