// Histórico do chat num Redis da Upstash (plano grátis), via API REST — sem dependência extra.
// Aceita as variáveis com os nomes da Upstash ou os que a integração da Vercel cria (KV_*).
// Sem essas variáveis o histórico fica desligado e o chat continua funcionando só ao vivo.

export type StoredMessage = {
  id: string;
  timestamp: number;
  message: string;
  identity: string;
  name: string;
};

const KEEP = 200; // mensagens guardadas por sala
const RETURN = 100; // mensagens devolvidas ao entrar
const TTL_SECONDS = 7 * 24 * 60 * 60; // a sala "esquece" depois de 7 dias sem mensagem nova

function redisEnv() {
  const url = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return url && token ? { url, token } : null;
}

export function historyEnabled() {
  return redisEnv() !== null;
}

async function pipeline(commands: (string | number)[][]) {
  const env = redisEnv();
  if (!env) throw new Error("Histórico desligado");
  const res = await fetch(`${env.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Upstash respondeu ${res.status}`);
  return (await res.json()) as { result?: unknown; error?: string }[];
}

const keyFor = (room: string) => `chatbem:chat:${room}`;

export async function loadHistory(room: string): Promise<StoredMessage[]> {
  const [res] = await pipeline([["LRANGE", keyFor(room), 0, RETURN - 1]]);
  const rows = Array.isArray(res?.result) ? (res.result as string[]) : [];
  const messages: StoredMessage[] = [];
  for (const row of rows) {
    try {
      messages.push(JSON.parse(row) as StoredMessage);
    } catch {
      // linha corrompida, pula
    }
  }
  return messages.reverse(); // LPUSH guarda do mais novo para o mais antigo
}

export async function saveMessage(room: string, msg: StoredMessage) {
  const key = keyFor(room);
  await pipeline([
    ["LPUSH", key, JSON.stringify(msg)],
    ["LTRIM", key, 0, KEEP - 1],
    ["EXPIRE", key, TTL_SECONDS],
  ]);
}
