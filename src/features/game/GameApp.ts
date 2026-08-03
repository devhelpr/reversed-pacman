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
import { createLegend, legendListHtml } from "../hud/Legend";
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
  private infoOpen = false;
  /** True when we paused the session specifically to open the info sheet. */
  private pausedForInfo = false;

  constructor(options: GameAppOptions) {
    this.mount = options.mount;
    this.onOpenDesigner = options.onOpenDesigner;

    this.mount.innerHTML = `
      <div class="game-shell">
        <div class="game-title-row desktop-chrome">
          <div class="game-title">
            <h1>Maze Chase</h1>
            <p class="tagline">You are the robot. Hunt the humans before they clear the maze.</p>
          </div>
          <div class="game-title-actions">
            <label class="level-select-wrap">
              <span>Level</span>
              <select data-el="level-select" aria-label="Select level"></select>
            </label>
            <button type="button" data-el="designer-btn" class="btn">Level Designer</button>
          </div>
        </div>
        <div class="mobile-topbar" aria-label="Game status">
          <h1 class="mobile-logo">Maze Chase</h1>
          <div class="mobile-score">
            <span class="hud-label">Score</span>
            <span data-el="mobile-score" class="hud-value">0</span>
          </div>
          <button type="button" data-el="info-btn" class="info-btn" aria-label="Pause and show info" title="Info">ⓘ</button>
        </div>
        <div class="hud-mount"></div>
        <div class="play-row">
          <div class="canvas-wrap" data-el="swipe-target">
            <canvas id="game-canvas" aria-label="Game maze"></canvas>
          </div>
          <div class="legend-mount"></div>
        </div>
        <div data-el="touch-mount" class="touch-mount"></div>
        <footer class="controls-help desktop-chrome">
          <span class="help-desktop"><kbd>←↑↓→</kbd> / <kbd>WASD</kbd> move</span>
          <span class="help-desktop"><kbd>P</kbd> pause</span>
          <span class="help-desktop"><kbd>R</kbd> restart</span>
        </footer>
        <dialog data-el="info-sheet" class="info-sheet" aria-labelledby="info-sheet-title">
          <div class="info-sheet-card">
            <div class="info-sheet-header">
              <h2 id="info-sheet-title">Info</h2>
              <button type="button" data-el="info-close" class="info-close" aria-label="Close info">✕</button>
            </div>
            <p data-el="info-objective" class="info-objective"></p>
            <div class="info-stats" data-el="info-stats"></div>
            <div class="info-actions">
              <button type="button" data-el="info-resume" class="btn btn-play">Resume</button>
              <button type="button" data-el="info-restart" class="btn">Restart</button>
            </div>
            <label class="level-select-wrap info-level">
              <span>Level</span>
              <select data-el="info-level-select" aria-label="Select level"></select>
            </label>
            <button type="button" data-el="info-designer" class="btn info-designer">Level Designer</button>
            <aside class="legend info-legend" aria-label="Legenda">
              <h3 class="legend-title">Legenda</h3>
              <ul class="legend-list">
                ${legendListHtml()}
              </ul>
            </aside>
          </div>
        </dialog>
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

    this.mount.querySelector("[data-el='level-select']")!.addEventListener("change", (e) => {
      const id = (e.target as HTMLSelectElement).value;
      this.loadLevel(id);
    });
    this.mount.querySelector("[data-el='designer-btn']")!.addEventListener("click", () => {
      this.onOpenDesigner?.();
    });

    this.wireInfoSheet();
    this.detachInput = this.input.attach();
    const touch = new TouchControls(this.input, touchMount, swipeTarget);
    this.detachTouch = touch.attach();
    this.wireOverlayTouch();
    this.fitCanvas();
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
    if (this.hud.overlay.open) this.hud.overlay.close();
    const infoSheet = this.mount.querySelector(
      "[data-el='info-sheet']",
    ) as HTMLDialogElement | null;
    if (infoSheet?.open) infoSheet.close();
    this.mount.replaceChildren();
  }

  loadLevel(level: LevelDefinition | string): void {
    const def = typeof level === "string" ? getLevel(level) : level;
    this.session = new GameSession(def);
    this.populateLevelSelect(def.id);
    this.closeInfo(false);
    this.fitCanvas();
    this.input.clearDirection();
  }

  refreshLevelList(): void {
    this.populateLevelSelect(this.session.level.id);
  }

  private wireInfoSheet(): void {
    const infoSheet = this.mount.querySelector("[data-el='info-sheet']") as HTMLDialogElement;

    this.mount.querySelector("[data-el='info-btn']")!.addEventListener("click", () => {
      if (this.infoOpen) this.closeInfo(true);
      else this.openInfo();
    });
    this.mount.querySelector("[data-el='info-close']")!.addEventListener("click", () => {
      this.closeInfo(true);
    });
    this.mount.querySelector("[data-el='info-resume']")!.addEventListener("click", () => {
      this.closeInfo(true);
    });
    this.mount.querySelector("[data-el='info-restart']")!.addEventListener("click", () => {
      this.closeInfo(false);
      this.input.requestRestart();
    });
    this.mount.querySelector("[data-el='info-designer']")!.addEventListener("click", () => {
      this.closeInfo(false);
      this.onOpenDesigner?.();
    });
    this.mount.querySelector("[data-el='info-level-select']")!.addEventListener("change", (e) => {
      const id = (e.target as HTMLSelectElement).value;
      this.loadLevel(id);
    });
    infoSheet.addEventListener("click", (e) => {
      if (e.target === infoSheet) this.closeInfo(true);
    });
    infoSheet.addEventListener("cancel", (e) => {
      e.preventDefault();
      this.closeInfo(true);
    });
  }

  private openInfo(): void {
    const infoSheet = this.mount.querySelector("[data-el='info-sheet']") as HTMLDialogElement;
    this.infoOpen = true;
    this.pausedForInfo = this.session.phase === "playing";
    if (this.pausedForInfo) this.session.togglePause();
    if (this.hud.overlay.open) this.hud.overlay.close();
    if (!infoSheet.open) infoSheet.showModal();
    this.mount.querySelector("[data-el='info-btn']")!.setAttribute("aria-expanded", "true");
    this.syncInfoSheet();
  }

  private closeInfo(resume: boolean): void {
    if (!this.infoOpen) return;
    const infoSheet = this.mount.querySelector("[data-el='info-sheet']") as HTMLDialogElement;
    this.infoOpen = false;
    if (infoSheet.open) infoSheet.close();
    this.mount.querySelector("[data-el='info-btn']")!.setAttribute("aria-expanded", "false");
    if (resume && this.pausedForInfo && this.session.phase === "paused") {
      this.session.togglePause();
    }
    this.pausedForInfo = false;
  }

  private syncInfoSheet(): void {
    const snap = this.session.getHud();
    const objective = this.mount.querySelector("[data-el='info-objective']");
    const stats = this.mount.querySelector("[data-el='info-stats']");
    if (objective) {
      const baitActive = !this.hud.baitBanner.classList.contains("hidden");
      objective.textContent = baitActive
        ? this.hud.baitBanner.textContent
        : this.hud.objective.textContent;
    }
    if (stats) {
      stats.innerHTML = `
        <div class="hud-group"><span class="hud-label">Level</span><span class="hud-value">${escapeHtml(snap.levelName)}</span></div>
        <div class="hud-group"><span class="hud-label">Floor</span><span class="hud-value">${escapeHtml(this.hud.floor.textContent ?? "")}</span></div>
        <div class="hud-group"><span class="hud-label">Dots</span><span class="hud-value">${snap.dotsRemaining}</span></div>
        <div class="hud-group"><span class="hud-label">Humans</span><span class="hud-value">${snap.ghostsRemaining}</span></div>
        <div class="hud-group"><span class="hud-label">Time</span><span class="hud-value">${escapeHtml(this.hud.time.textContent ?? "")}</span></div>
        <div class="hud-group"><span class="hud-label">Score</span><span class="hud-value">${snap.score}</span></div>
      `;
    }
  }

  private wireOverlayTouch(): void {
    const act = (): void => {
      if (this.infoOpen) return;
      const phase = this.session.phase;
      if (phase === "ready") this.input.requestStart();
      else if (phase === "paused") this.input.requestPause();
      else if (phase === "won" || phase === "lost") this.input.requestRestart();
    };

    this.hud.overlay.addEventListener("pointerup", (event) => {
      // Ignore right-clicks; treat overlay tap as primary mobile action
      if (event.button !== 0 && event.pointerType === "mouse") return;
      act();
    });
    // Keep the dialog open; Escape should trigger the same primary action.
    this.hud.overlay.addEventListener("cancel", (event) => {
      event.preventDefault();
      act();
    });
  }

  private populateLevelSelect(selectedId: string): void {
    const optionsHtml = listLevels()
      .map((level) => {
        const tag = isBuiltinLevel(level.id) ? "" : " ★";
        return `<option value="${level.id}" ${level.id === selectedId ? "selected" : ""}>${escapeHtml(level.name)}${tag}</option>`;
      })
      .join("");

    for (const sel of this.mount.querySelectorAll<HTMLSelectElement>(
      "[data-el='level-select'], [data-el='info-level-select']",
    )) {
      sel.innerHTML = optionsHtml;
    }
  }

  private fitCanvas = (): void => {
    const wrap = this.mount.querySelector(".canvas-wrap") as HTMLElement;
    const maxW = Math.min(wrap.clientWidth || window.innerWidth - 32, 720);
    const isNarrow = window.matchMedia("(max-width: 860px), (pointer: coarse)").matches;
    let maxH: number;
    if (isNarrow) {
      const topbar = this.mount.querySelector(".mobile-topbar") as HTMLElement | null;
      const touch = this.mount.querySelector(".touch-mount") as HTMLElement | null;
      const chrome = (topbar?.offsetHeight ?? 40) + (touch?.offsetHeight || 160) + 28;
      maxH = Math.min(Math.max(window.innerHeight - chrome, 180), 520);
    } else {
      maxH = Math.min(window.innerHeight * 0.58, 640);
    }
    this.renderer.resizeForMaze(this.session.maze, maxW, maxH);
  };

  private update = (dt: number): void => {
    if (this.input.consumeRestart()) {
      if (this.session.phase !== "ready") {
        this.closeInfo(false);
        this.session.restart();
        this.input.clearDirection();
        this.fitCanvas();
      }
    }
    if (this.input.consumePause()) {
      if (this.infoOpen) {
        this.closeInfo(false);
      } else {
        this.session.togglePause();
      }
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
    updateHud(this.hud, this.session.getHud(), { suppressOverlay: this.infoOpen });

    const mobileScore = this.mount.querySelector("[data-el='mobile-score']");
    if (mobileScore) mobileScore.textContent = this.hud.score.textContent;

    if (this.infoOpen) this.syncInfoSheet();
  };
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
