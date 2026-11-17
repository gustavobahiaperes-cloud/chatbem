// Sons curtos gerados na hora (Web Audio), sem arquivos de áudio para baixar.

export type SoundKind = "join" | "leave" | "message";

const NOTES: Record<SoundKind, { freqs: number[]; step: number; volume: number }> = {
  join: { freqs: [587, 880], step: 0.09, volume: 0.12 }, // sobe: alguém entrou
  leave: { freqs: [784, 523], step: 0.09, volume: 0.1 }, // desce: alguém saiu
  message: { freqs: [1046], step: 0.07, volume: 0.07 }, // "plim" de mensagem
};

let ctx: AudioContext | null = null;

export function playSound(kind: SoundKind) {
  try {
    ctx ??= new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    const { freqs, step, volume } = NOTES[kind];
    const start = ctx.currentTime;
    freqs.forEach((freq, i) => {
      const t = start + i * step;
      const osc = ctx!.createOscillator();
      const gain = ctx!.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, t);
      gain.gain.linearRampToValueAtTime(volume, t + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + step + 0.12);
      osc.connect(gain).connect(ctx!.destination);
      osc.start(t);
      osc.stop(t + step + 0.15);
    });
  } catch {
    // navegador sem Web Audio — fica sem som, sem problema
  }
}
