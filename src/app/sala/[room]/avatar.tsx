import type { Participant } from "livekit-client";

export function displayNameOf(p: Participant) {
  return p.name || p.identity;
}

function initialsOf(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Cor estável por nome, para cada pessoa ter sempre o mesmo avatar.
function hueOf(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}

export function nameColor(name: string) {
  return `hsl(${hueOf(name)} 70% 72%)`;
}

export function Avatar({
  name,
  speaking = false,
  size = 36,
}: {
  name: string;
  speaking?: boolean;
  size?: number;
}) {
  return (
    <span
      aria-hidden
      className={`relative grid shrink-0 place-items-center rounded-full font-bold text-white transition-shadow ${
        speaking
          ? "shadow-[0_0_0_2px_var(--surface),0_0_0_4px_var(--accent-2)]"
          : "shadow-[0_0_0_2px_transparent]"
      }`}
      style={{
        width: size,
        height: size,
        fontSize: Math.round(size * 0.36),
        background: `hsl(${hueOf(name)} 42% 44%)`,
      }}
    >
      {initialsOf(name)}
    </span>
  );
}
