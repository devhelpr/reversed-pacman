import { GameLoop } from "../../core/engine/GameLoop";
import { InputManager } from "../../core/engine/Input";
import { CanvasRenderer } from "../../core/render/CanvasRenderer";
import {
  getFirstLevel,
  getLevel,
  isBuiltinLevel,
  listLevels,
  type LevelDefinition,
} from "../levels";
import { GameSession } from "./GameSession";
import { createHud, updateHud, type HudElements } from "../hud/Hud";
import { createLegend } from "../hud/Legend";
import { TouchControls } from "../controls/TouchControls";

export interface GameAppOptions {
  mount: HTMLElement;
  levelId?: string;
  level?: LevelDefinition;
  onOpenDesigner?: () => void;
}

/**
 * Top-level feature that wires engine, session, renderer, and HUD.
 * Swap levels via `loadLevel(id)` once more mazes are registered.
 */
export class GameApp {
  private readonly mount: HTMLElement;
  private readonly input = new InputManager();
  private readonly detachInput: () => void;
  private readonly detachTouch: () => void;
  private readonly renderer: CanvasRenderer;
  private readonly hud: HudElements;
  private readonly loop: GameLoop;
  private readonly onOpenDesigner?: () => void;
  private session: GameSession;

  constructor(options: GameAppOptions) {
    this.mount = options.mount;
    this.onOpenDesigner = options.onOpenDesigner;

    this.mount.innerHTML = `
      <div class="game-shell">
        <div class="game-title-row">
          <div class="game-title">
            <h1>Reversed Pac-Man</h1>
            <p class="tagline">You hunt the ghosts. The dots are theirs to steal.</p>
          </div>
          <div class="game-title-actions">
            <label class="level-select-wrap">
              <span>Level</span>
              <select data-el="level-select" aria-label="Select level"></select>
            </label>
            <button type="button" data-el="designer-btn" class="btn">Level Designer</button>
          </div>
        </div>
        <div class="hud-mount"></div>
        <div class="play-row">
          <div class="canvas-wrap" data-el="swipe-target">
            <canvas id="game-canvas" aria-label="Game maze"></canvas>
          </div>
          <div class="legend-mount"></div>
        </div>
        <div data-el="touch-mount" class="touch-mount"></div>
        <footer class="controls-help">
          <span class="help-desktop"><kbd>←↑↓→</kbd> / <kbd>WASD</kbd> move</span>
          <span class="help-desktop"><kbd>P</kbd> pause</span>
          <span class="help-desktop"><kbd>R</kbd> restart</span>
          <span class="help-touch">Swipe maze or use on-screen pad</span>
        </footer>
      </div>
    `;

    const canvas = this.mount.querySelector("#game-canvas") as HTMLCanvasElement;
    const hudMount = this.mount.querySelector(".hud-mount") as HTMLElement;
    const legendMount = this.mount.querySelector(".legend-mount") as HTMLElement;
    const touchMount = this.mount.querySelector("[data-el='touch-mount']") as HTMLElement;
    const swipeTarget = this.mount.querySelector("[data-el='swipe-target']") as HTMLElement;
    this.hud = createHud(hudMount);
    createLegend(legendMount);
    this.renderer = new CanvasRenderer(canvas);

    const level = options.level ?? (options.levelId ? getLevel(options.levelId) : getFirstLevel());
    this.session = new GameSession(level);
    this.populateLevelSelect(level.id);
    this.fitCanvas();

    this.mount.querySelector("[data-el='level-select']")!.addEventListener("change", (e) => {
      const id = (e.target as HTMLSelectElement).value;
      this.loadLevel(id);
    });
    this.mount.querySelector("[data-el='designer-btn']")!.addEventListener("click", () => {
      this.onOpenDesigner?.();
    });

    this.detachInput = this.input.attach();
    const touch = new TouchControls(this.input, touchMount, swipeTarget);
    this.detachTouch = touch.attach();
    this.wireOverlayTouch();
    this.loop = new GameLoop(this.update, this.render);
    window.addEventListener("resize", this.fitCanvas);
  }

  start(): void {
    this.loop.start();
  }

  destroy(): void {
    this.loop.stop();
    this.detachInput();
    this.detachTouch();
    window.removeEventListener("resize", this.fitCanvas);
    this.mount.replaceChildren();
  }

  loadLevel(level: LevelDefinition | string): void {
    const def = typeof level === "string" ? getLevel(level) : level;
    this.session = new GameSession(def);
    this.populateLevelSelect(def.id);
    this.fitCanvas();
    this.input.clearDirection();
  }

  refreshLevelList(): void {
    this.populateLevelSelect(this.session.level.id);
  }

  private wireOverlayTouch(): void {
    this.hud.overlay.addEventListener("pointerup", (event) => {
      // Ignore right-clicks; treat overlay tap as primary mobile action
      if (event.button !== 0 && event.pointerType === "mouse") return;
      const phase = this.session.phase;
      if (phase === "ready") this.input.requestStart();
      else if (phase === "paused") this.input.requestPause();
      else if (phase === "won" || phase === "lost") this.input.requestRestart();
    });
  }

  private populateLevelSelect(selectedId: string): void {
    const select = this.mount.querySelector<HTMLSelectElement>("[data-el='level-select']");
    if (!select) return;
    const levels = listLevels();
    select.innerHTML = levels
      .map((level) => {
        const tag = isBuiltinLevel(level.id) ? "" : " ★";
        return `<option value="${level.id}" ${level.id === selectedId ? "selected" : ""}>${escapeHtml(level.name)}${tag}</option>`;
      })
      .join("");
  }

  private fitCanvas = (): void => {
    const wrap = this.mount.querySelector(".canvas-wrap") as HTMLElement;
    const maxW = Math.min(wrap.clientWidth || window.innerWidth - 32, 720);
    const isNarrow = window.matchMedia("(max-width: 860px), (pointer: coarse)").matches;
    const maxH = Math.min(window.innerHeight * (isNarrow ? 0.42 : 0.58), isNarrow ? 480 : 640);
    this.renderer.resizeForMaze(this.session.maze, maxW, maxH);
  };

  private update = (dt: number): void => {
    if (this.input.consumeRestart()) {
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
    this.renderer.render(
      this.session.maze,
      this.session.getActors(),
      this.session.getTrapVisuals(),
      this.session.getViewFloor(),
      this.session.getLiftTransition(),
    );
    updateHud(this.hud, this.session.getHud());
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
