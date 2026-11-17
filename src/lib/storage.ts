// localStorage pode estar bloqueado (aba anônima, cookies desligados):
// nesse caso só não lembramos a preferência, sem quebrar a tela.

export const STORAGE = {
  name: "chatbem:name",
  mic: "chatbem:mic",
  prefs: "chatbem:prefs",
  volumes: "chatbem:volumes",
} as const;

export function readStorage(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeStorage(key: string, value: string) {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // armazenamento bloqueado — ignora
  }
}

export function readJSON<T>(key: string, fallback: T): T {
  const raw = readStorage(key);
  if (!raw) return fallback;
  try {
    return { ...fallback, ...(JSON.parse(raw) as T) };
  } catch {
    return fallback;
  }
}
