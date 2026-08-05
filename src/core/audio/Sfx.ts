/**
 * Tiny procedural arcade SFX — no asset files, unlocks on first gesture.
 */

export type SfxKind =
  | "start"
  | "catch"
  | "bait"
  | "bonus"
  | "zap"
  | "fall"
  | "ghost"
  | "dots"
  | "win"
  | "lift"
  | "rift"
  | "pause";

type Tone = {
  freq: number;
  dur: number;
  type?: OscillatorType;
  gain?: number;
  slide?: number;
  delay?: number;
};

const LIBRARY: Record<SfxKind, Tone[]> = {
  start: [
    { freq: 220, dur: 0.06, type: "square", gain: 0.04 },
    { freq: 330, dur: 0.07, type: "square", gain: 0.045, delay: 0.05 },
    { freq: 440, dur: 0.1, type: "square", gain: 0.05, delay: 0.1 },
  ],
  catch: [
    { freq: 520, dur: 0.05, type: "square", gain: 0.055 },
    { freq: 780, dur: 0.08, type: "square", gain: 0.05, delay: 0.04 },
    { freq: 1040, dur: 0.1, type: "triangle", gain: 0.035, delay: 0.09 },
  ],
  bait: [
    { freq: 180, dur: 0.08, type: "sawtooth", gain: 0.03, slide: 420 },
    { freq: 360, dur: 0.12, type: "square", gain: 0.04, delay: 0.06, slide: 620 },
  ],
  bonus: [
    { freq: 660, dur: 0.05, type: "square", gain: 0.04 },
    { freq: 990, dur: 0.08, type: "triangle", gain: 0.035, delay: 0.04 },
  ],
  zap: [
    { freq: 140, dur: 0.12, type: "sawtooth", gain: 0.05, slide: 40 },
    { freq: 90, dur: 0.18, type: "square", gain: 0.04, delay: 0.05, slide: 30 },
  ],
  fall: [{ freq: 320, dur: 0.35, type: "square", gain: 0.04, slide: 60 }],
  ghost: [
    { freq: 220, dur: 0.1, type: "sawtooth", gain: 0.045, slide: 90 },
    { freq: 110, dur: 0.2, type: "square", gain: 0.04, delay: 0.08, slide: 50 },
  ],
  dots: [{ freq: 160, dur: 0.18, type: "triangle", gain: 0.04, slide: 70 }],
  win: [
    { freq: 392, dur: 0.08, type: "square", gain: 0.04 },
    { freq: 523, dur: 0.08, type: "square", gain: 0.04, delay: 0.08 },
    { freq: 659, dur: 0.08, type: "square", gain: 0.045, delay: 0.16 },
    { freq: 784, dur: 0.18, type: "triangle", gain: 0.05, delay: 0.24 },
  ],
  lift: [{ freq: 280, dur: 0.2, type: "triangle", gain: 0.03, slide: 480 }],
  rift: [
    { freq: 500, dur: 0.06, type: "sine", gain: 0.035, slide: 200 },
    { freq: 240, dur: 0.1, type: "sine", gain: 0.03, delay: 0.05, slide: 420 },
  ],
  pause: [{ freq: 300, dur: 0.04, type: "square", gain: 0.025 }],
};

export class Sfx {
  private ctx: AudioContext | null = null;
  private unlocked = false;
  muted = false;

  unlock(): void {
    if (this.unlocked) return;
    const ctx = this.ensure();
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    this.unlocked = true;
  }

  play(kind: SfxKind): void {
    if (this.muted) return;
    this.unlock();
    const ctx = this.ensure();
    if (!ctx || ctx.state !== "running") return;

    const tones = LIBRARY[kind];
    const now = ctx.currentTime;
    for (const tone of tones) {
      this.blip(ctx, now + (tone.delay ?? 0), tone);
    }
  }

  private ensure(): AudioContext | null {
    if (typeof AudioContext === "undefined" && typeof webkitAudioContext === "undefined") {
      return null;
    }
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? webkitAudioContext;
      this.ctx = new Ctor();
    }
    return this.ctx;
  }

  private blip(ctx: AudioContext, when: number, tone: Tone): void {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = tone.type ?? "square";
    osc.frequency.setValueAtTime(tone.freq, when);
    if (tone.slide !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(Math.max(30, tone.slide), when + tone.dur);
    }

    const g = tone.gain ?? 0.04;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.exponentialRampToValueAtTime(g, when + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + tone.dur);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(when);
    osc.stop(when + tone.dur + 0.02);
  }
}

declare const webkitAudioContext: typeof AudioContext | undefined;
