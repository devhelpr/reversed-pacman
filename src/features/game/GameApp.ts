import { GameLoop } from "../../core/engine/GameLoop";
import { InputManager } from "../../core/engine/Input";
import { CanvasRenderer } from "../../core/render/CanvasRenderer";
import { getFirstLevel, getLevel, type LevelDefinition } from "../levels";
import { GameSession } from "./GameSession";
import { createHud, updateHud, type HudElements } from "../hud/Hud";

export interface GameAppOptions {
  mount: HTMLElement;
  levelId?: string;
}

/**
 * Top-level feature that wires engine, session, renderer, and HUD.
 * Swap levels via `loadLevel(id)` once more mazes are registered.
 */
export class GameApp {
  private readonly mount: HTMLElement;
  private readonly input = new InputManager();
  private readonly detachInput: () => void;
  private readonly renderer: CanvasRenderer;
  private readonly hud: HudElements;
  private readonly loop: GameLoop;
  private session: GameSession;

  constructor(options: GameAppOptions) {
    this.mount = options.mount;

    this.mount.innerHTML = `
      <div class="game-shell">
        <div class="game-title">
          <h1>Reversed Pac-Man</h1>
          <p class="tagline">You hunt the ghosts. The dots are theirs to steal.</p>
        </div>
        <div class="hud-mount"></div>
        <div class="canvas-wrap">
          <canvas id="game-canvas" aria-label="Game maze"></canvas>
        </div>
        <footer class="controls-help">
          <span><kbd>←↑↓→</kbd> / <kbd>WASD</kbd> move</span>
          <span><kbd>P</kbd> pause</span>
          <span><kbd>R</kbd> restart</span>
        </footer>
      </div>
    `;

    const canvas = this.mount.querySelector("#game-canvas") as HTMLCanvasElement;
    const hudMount = this.mount.querySelector(".hud-mount") as HTMLElement;
    this.hud = createHud(hudMount);
    this.renderer = new CanvasRenderer(canvas);

    const level = options.levelId ? getLevel(options.levelId) : getFirstLevel();
    this.session = new GameSession(level);
    this.fitCanvas();

    this.detachInput = this.input.attach();
    this.loop = new GameLoop(this.update, this.render);
    window.addEventListener("resize", this.fitCanvas);
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.detachInput();
    window.removeEventListener("resize", this.fitCanvas);
  }

  loadLevel(level: LevelDefinition | string): void {
    const def = typeof level === "string" ? getLevel(level) : level;
    this.session = new GameSession(def);
    this.fitCanvas();
  }

  private fitCanvas = (): void => {
    const wrap = this.mount.querySelector(".canvas-wrap") as HTMLElement;
    const maxW = Math.min(wrap.clientWidth || window.innerWidth - 32, 900);
    const maxH = Math.min(window.innerHeight * 0.62, 700);
    this.renderer.resizeForMaze(this.session.maze, maxW, maxH);
  };

  private update = (dt: number): void => {
    if (this.input.consumeRestart()) {
      // Restart only matters after a round has begun or ended
      if (this.session.phase !== "ready") {
        this.session.restart();
        this.input.clearDirection();
        this.fitCanvas();
      }
    }
    if (this.input.consumePause()) {
      this.session.togglePause();
    }

    const startRequested = this.input.consumeStart();
    this.session.update(dt, this.input.getDesiredDirection(), startRequested);
    this.renderer.advanceAnim(dt);
  };

  private render = (): void => {
    this.renderer.render(this.session.maze, this.session.getActors());
    updateHud(this.hud, this.session.getHud());
  };
}
