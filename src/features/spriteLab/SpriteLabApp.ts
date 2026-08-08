import { loadWalkLabFrames, type WalkLabFrames, type WalkSheetId } from "../../core/render/Sprites";
import { TARGET_FRAME } from "../../core/render/SpriteSheet";

export interface SpriteLabAppOptions {
  mount: HTMLElement;
  onBack: () => void;
}

const FRAME_MS = 100;
const GAME_ZOOM = 8;

/**
 * Dev page to scrub / play walk spritesheets at native and game sizes.
 * Route: `#/sprites`
 */
export class SpriteLabApp {
  private readonly mount: HTMLElement;
  private readonly onBack: () => void;
  private sheets = new Map<WalkSheetId, WalkLabFrames>();
  private active: WalkSheetId = "robot";
  private frame = 0;
  private playing = false;
  private raf = 0;
  private lastTick = 0;
  private accum = 0;
  private keyHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(options: SpriteLabAppOptions) {
    this.mount = options.mount;
    this.onBack = options.onBack;
  }

  async start(): Promise<void> {
    this.mount.innerHTML = `
      <div class="sprite-lab">
        <header class="sprite-lab-top">
          <div>
            <h1>Sprite Lab</h1>
            <p class="tagline">Walk-sheet frames at native size and game downscale.</p>
          </div>
          <button type="button" class="btn" data-action="back">← Play</button>
        </header>
        <p class="sprite-lab-status" data-el="status">Loading sheets…</p>
      </div>
    `;
    this.mount
      .querySelector("[data-action='back']")!
      .addEventListener("click", () => this.onBack());

    try {
      const [robot, alien] = await Promise.all([
        loadWalkLabFrames("robot"),
        loadWalkLabFrames("alien"),
      ]);
      this.sheets.set("robot", robot);
      this.sheets.set("alien", alien);
      this.render();
      this.bind();
      this.draw();
    } catch (err) {
      const status = this.mount.querySelector("[data-el='status']");
      if (status) {
        status.textContent = `Failed to load sheets: ${err instanceof Error ? err.message : String(err)}`;
      }
    }
  }

  destroy(): void {
    this.stopLoop();
    if (this.keyHandler) {
      window.removeEventListener("keydown", this.keyHandler);
      this.keyHandler = null;
    }
    this.mount.replaceChildren();
  }

  private current(): WalkLabFrames {
    return this.sheets.get(this.active)!;
  }

  private frameCount(): number {
    return this.current()?.native.length ?? 0;
  }

  private render(): void {
    const sheet = this.current();
    this.mount.innerHTML = `
      <div class="sprite-lab">
        <header class="sprite-lab-top">
          <div>
            <h1>Sprite Lab</h1>
            <p class="tagline">Walk-sheet frames at native size and game downscale.</p>
          </div>
          <button type="button" class="btn" data-action="back">← Play</button>
        </header>

        <div class="sprite-lab-toolbar">
          <div class="sprite-lab-tabs" role="tablist" aria-label="Spritesheet">
            <button type="button" class="btn ${this.active === "robot" ? "btn-accent" : ""}" data-sheet="robot" role="tab" aria-selected="${this.active === "robot"}">Robot</button>
            <button type="button" class="btn ${this.active === "alien" ? "btn-accent" : ""}" data-sheet="alien" role="tab" aria-selected="${this.active === "alien"}">Alien</button>
          </div>
          <p class="sprite-lab-meta" data-el="meta"></p>
        </div>

        <div class="sprite-lab-stages">
          <figure class="sprite-lab-stage">
            <figcaption>Native <span data-el="native-size"></span></figcaption>
            <canvas data-el="native" class="sprite-lab-canvas sprite-lab-canvas-native"></canvas>
          </figure>
          <figure class="sprite-lab-stage">
            <figcaption>Game ${TARGET_FRAME}×${TARGET_FRAME}</figcaption>
            <canvas data-el="game" class="sprite-lab-canvas sprite-lab-canvas-game" width="${TARGET_FRAME}" height="${TARGET_FRAME}"></canvas>
          </figure>
          <figure class="sprite-lab-stage">
            <figcaption>Game ×${GAME_ZOOM} (nearest)</figcaption>
            <canvas data-el="zoomed" class="sprite-lab-canvas sprite-lab-canvas-zoomed" width="${TARGET_FRAME * GAME_ZOOM}" height="${TARGET_FRAME * GAME_ZOOM}"></canvas>
          </figure>
        </div>

        <div class="sprite-lab-controls">
          <button type="button" class="btn" data-action="prev" aria-label="Previous frame">◀ Prev</button>
          <button type="button" class="btn btn-accent" data-action="play" aria-label="Play or pause animation">Play</button>
          <button type="button" class="btn" data-action="next" aria-label="Next frame">Next ▶</button>
        </div>
        <p class="sprite-lab-frame" data-el="frame-label"></p>
        <p class="sprite-lab-hint">← → step frames · Space play/pause · ${sheet.url}</p>
      </div>
    `;
  }

  private bind(): void {
    const root = this.mount.querySelector(".sprite-lab")!;
    root.querySelector("[data-action='back']")!.addEventListener("click", () => {
      location.hash = "";
      this.onBack();
    });
    root.querySelector("[data-action='prev']")!.addEventListener("click", () => this.step(-1));
    root.querySelector("[data-action='next']")!.addEventListener("click", () => this.step(1));
    root.querySelector("[data-action='play']")!.addEventListener("click", () => this.togglePlay());
    for (const btn of root.querySelectorAll<HTMLButtonElement>("[data-sheet]")) {
      btn.addEventListener("click", () => {
        const id = btn.dataset.sheet as WalkSheetId;
        if (id === this.active) return;
        this.active = id;
        this.frame = 0;
        this.stopPlay();
        if (this.keyHandler) {
          window.removeEventListener("keydown", this.keyHandler);
          this.keyHandler = null;
        }
        this.render();
        this.bind();
        this.draw();
      });
    }

    this.keyHandler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === "ArrowLeft") {
        e.preventDefault();
        this.step(-1);
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        this.step(1);
      } else if (e.key === " " || e.code === "Space") {
        e.preventDefault();
        this.togglePlay();
      }
    };
    window.addEventListener("keydown", this.keyHandler);
  }

  private step(delta: number): void {
    const n = this.frameCount();
    if (n <= 0) return;
    this.stopPlay();
    this.frame = (this.frame + delta + n) % n;
    this.draw();
  }

  private togglePlay(): void {
    if (this.playing) this.stopPlay();
    else this.startPlay();
  }

  private startPlay(): void {
    if (this.playing || this.frameCount() <= 0) return;
    this.playing = true;
    this.lastTick = performance.now();
    this.accum = 0;
    this.updatePlayButton();
    const tick = (now: number) => {
      if (!this.playing) return;
      const dt = now - this.lastTick;
      this.lastTick = now;
      this.accum += dt;
      while (this.accum >= FRAME_MS) {
        this.accum -= FRAME_MS;
        this.frame = (this.frame + 1) % this.frameCount();
        this.draw();
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private stopPlay(): void {
    this.playing = false;
    this.stopLoop();
    this.updatePlayButton();
  }

  private stopLoop(): void {
    if (this.raf) {
      cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  private updatePlayButton(): void {
    const btn = this.mount.querySelector<HTMLButtonElement>("[data-action='play']");
    if (btn) btn.textContent = this.playing ? "Pause" : "Play";
  }

  private draw(): void {
    const sheet = this.current();
    if (!sheet || sheet.native.length === 0) return;

    const idx = this.frame % sheet.native.length;
    const native = sheet.native[idx]!;
    const game = sheet.game[Math.min(idx, sheet.game.length - 1)]!;

    const nativeCanvas = this.mount.querySelector<HTMLCanvasElement>("[data-el='native']")!;
    const gameCanvas = this.mount.querySelector<HTMLCanvasElement>("[data-el='game']")!;
    const zoomedCanvas = this.mount.querySelector<HTMLCanvasElement>("[data-el='zoomed']")!;

    const stageW = Math.max(...sheet.native.map((f) => f.width));
    const stageH = Math.max(...sheet.native.map((f) => f.height));
    if (nativeCanvas.width !== stageW || nativeCanvas.height !== stageH) {
      nativeCanvas.width = stageW;
      nativeCanvas.height = stageH;
    }

    const nctx = nativeCanvas.getContext("2d")!;
    nctx.imageSmoothingEnabled = false;
    nctx.fillStyle = "#0a0806";
    nctx.fillRect(0, 0, stageW, stageH);
    nctx.drawImage(
      native,
      Math.floor((stageW - native.width) / 2),
      Math.floor((stageH - native.height) / 2),
    );

    const gctx = gameCanvas.getContext("2d")!;
    gctx.imageSmoothingEnabled = false;
    gctx.fillStyle = "#0a0806";
    gctx.fillRect(0, 0, 28, 28);
    gctx.drawImage(game, 0, 0);

    const z = GAME_ZOOM;
    const zctx = zoomedCanvas.getContext("2d")!;
    zctx.imageSmoothingEnabled = false;
    zctx.fillStyle = "#0a0806";
    zctx.fillRect(0, 0, 28 * z, 28 * z);
    zctx.drawImage(game, 0, 0, 28, 28, 0, 0, 28 * z, 28 * z);

    const sizeEl = this.mount.querySelector("[data-el='native-size']");
    if (sizeEl) sizeEl.textContent = `${native.width}×${native.height}`;

    const meta = this.mount.querySelector("[data-el='meta']");
    if (meta) {
      meta.textContent = `${sheet.label} · ${sheet.native.length} frames · stage ${stageW}×${stageH}`;
    }

    const label = this.mount.querySelector("[data-el='frame-label']");
    if (label) {
      label.textContent = `Frame ${idx + 1} / ${sheet.native.length}${this.playing ? " · playing" : ""}`;
    }
    this.updatePlayButton();
  }
}
