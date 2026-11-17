import { RoomServiceClient, TokenVerifier } from "livekit-server-sdk";

export const ROOM_RE = /^[a-zA-Z0-9_+-]{1,64}$/;

export const MISSING_ENV_ERROR =
  "Servidor sem as variáveis LIVEKIT_API_KEY / LIVEKIT_API_SECRET / LIVEKIT_URL configuradas.";

export function livekitEnv() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const wsUrl = process.env.LIVEKIT_URL;
  if (!apiKey || !apiSecret || !wsUrl) return null;
  return { apiKey, apiSecret, wsUrl };
}

export function roomClient() {
  const env = livekitEnv();
  if (!env) return null;
  return new RoomServiceClient(env.wsUrl.replace(/^ws/, "http"), env.apiKey, env.apiSecret);
}

export type Caller = { identity: string; name: string };

/**
 * Confere quem está fazendo a requisição usando o token do LiveKit que a própria
 * pessoa recebeu ao entrar (enviado em "Authorization: Bearer <token>").
 * Só aceita tokens válidos, assinados por este servidor, e da sala informada.
 */
export async function verifyCaller(req: Request, room: string): Promise<Caller | null> {
  const env = livekitEnv();
  if (!env) return null;
  const header = req.headers.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token) return null;
  try {
    const claims = await new TokenVerifier(env.apiKey, env.apiSecret).verify(token);
    if (!claims.sub || claims.video?.room !== room) return null;
    return { identity: claims.sub, name: claims.name || claims.sub };
  } catch {
    return null;
  }
}
