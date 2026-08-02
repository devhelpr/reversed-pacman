export type UpdateFn = (dtSeconds: number) => void;
export type RenderFn = (alpha: number) => void;

/**
 * Fixed-timestep game loop with rendering interpolation hook.
 */
export class GameLoop {
  private readonly update: UpdateFn;
  private readonly render: RenderFn;
  private readonly step: number;
  private accumulator = 0;
  private lastTime = 0;
  private rafId = 0;
  private running = false;

  constructor(update: UpdateFn, render: RenderFn, ticksPerSecond = 60) {
    this.update = update;
    this.render = render;
    this.step = 1 / ticksPerSecond;
  }

  start(): void {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.rafId = requestAnimationFrame(this.tick);
  }

  stop(): void {
    this.running = false;
    cancelAnimationFrame(this.rafId);
  }

  private tick = (now: number): void => {
    if (!this.running) return;

    const elapsed = Math.min((now - this.lastTime) / 1000, 0.25);
    this.lastTime = now;
    this.accumulator += elapsed;

    while (this.accumulator >= this.step) {
      this.update(this.step);
      this.accumulator -= this.step;
    }

    this.render(this.accumulator / this.step);
    this.rafId = requestAnimationFrame(this.tick);
  };
}
