// Satisfying completion "ding" — two quick sine tones, no audio assets.
let ctx: AudioContext | null = null;

export function ding() {
  try {
    ctx ??= new AudioContext();
    const notes = [
      { freq: 659.25, at: 0 }, // E5
      { freq: 987.77, at: 0.09 }, // B5
    ];
    for (const { freq, at } of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.frequency.value = freq;
      osc.type = 'sine';
      gain.gain.setValueAtTime(0.12, ctx.currentTime + at);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + at + 0.35);
      osc.connect(gain).connect(ctx.destination);
      osc.start(ctx.currentTime + at);
      osc.stop(ctx.currentTime + at + 0.4);
    }
  } catch {
    // audio is a nicety; never let it break the app
  }
}
