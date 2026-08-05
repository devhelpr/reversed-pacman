/**
 * Crisp pixel particles — square dots only, no soft gradients.
 */

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  gravity: number;
}

export interface Floater {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  text: string;
  color: string;
}

export class ParticleSystem {
  particles: Particle[] = [];
  floaters: Floater[] = [];

  clear(): void {
    this.particles.length = 0;
    this.floaters.length = 0;
  }

  burst(
    x: number,
    y: number,
    colors: readonly string[],
    count: number,
    opts: {
      speed?: number;
      life?: number;
      size?: number;
      gravity?: number;
      spread?: number;
    } = {},
  ): void {
    const speed = opts.speed ?? 55;
    const life = opts.life ?? 0.45;
    const size = opts.size ?? 2;
    const gravity = opts.gravity ?? 90;
    const spread = opts.spread ?? Math.PI * 2;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * spread - spread / 2 - Math.PI / 2;
      const mag = speed * (0.35 + Math.random() * 0.75);
      const maxLife = life * (0.55 + Math.random() * 0.55);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * mag,
        vy: Math.sin(angle) * mag,
        life: maxLife,
        maxLife,
        size: Math.max(1, Math.round(size * (0.7 + Math.random() * 0.6))),
        color: colors[i % colors.length]!,
        gravity,
      });
    }
  }

  ring(x: number, y: number, colors: readonly string[], count: number, speed = 70): void {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const mag = speed * (0.85 + Math.random() * 0.25);
      const maxLife = 0.35 + Math.random() * 0.2;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * mag,
        vy: Math.sin(angle) * mag,
        life: maxLife,
        maxLife,
        size: 2,
        color: colors[i % colors.length]!,
        gravity: 20,
      });
    }
  }

  floater(x: number, y: number, text: string, color: string, duration = 0.85): void {
    this.floaters.push({ x, y, life: duration, maxLife: duration, text, color });
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i]!;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
    }

    for (let i = this.floaters.length - 1; i >= 0; i--) {
      const f = this.floaters[i]!;
      f.life -= dt;
      if (f.life <= 0) {
        this.floaters.splice(i, 1);
        continue;
      }
      f.y -= 22 * dt;
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const t = p.life / p.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.35);
      ctx.fillStyle = p.color;
      const s = p.size;
      ctx.fillRect(Math.round(p.x - s / 2), Math.round(p.y - s / 2), s, s);
    }
    ctx.globalAlpha = 1;

    ctx.imageSmoothingEnabled = false;
    for (const f of this.floaters) {
      const t = f.life / f.maxLife;
      ctx.globalAlpha = Math.min(1, t * 1.6);
      ctx.fillStyle = "#0A0806";
      ctx.font = '8px "Press Start 2P", monospace';
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const x = Math.round(f.x);
      const y = Math.round(f.y);
      ctx.fillText(f.text, x + 1, y + 1);
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, x, y);
    }
    ctx.globalAlpha = 1;
  }
}
