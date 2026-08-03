import type { HudSnapshot } from "../../core/render/CanvasRenderer";
import {
  getHighScoreBoard,
  getHighScores,
  getLastPlayerName,
  type HighScoreEntry,
} from "../../core/scoring/HighScores";
import { listLevels } from "../levels";

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${rem.toString().padStart(2, "0")}.${ms}`;
}

export type OverlaySlide = "main" | "scores";

export interface HighScorePrompt {
  rank: number;
  score: number;
  submitted: boolean;
  playerName: string;
}

export interface HudElements {
  root: HTMLElement;
  level: HTMLElement;
  floor: HTMLElement;
  dots: HTMLElement;
  ghosts: HTMLElement;
  time: HTMLElement;
  score: HTMLElement;
  objective: HTMLElement;
  baitBanner: HTMLElement;
  overlay: HTMLDialogElement;
  overlayCard: HTMLElement;
  overlayLogo: HTMLElement;
  overlayTitle: HTMLElement;
  overlayBody: HTMLElement;
  overlayHint: HTMLElement;
  overlayCta: HTMLElement;
  overlayHighScore: HTMLElement;
  overlayNameForm: HTMLElement;
  overlayNameInput: HTMLInputElement;
  overlayNameSubmit: HTMLButtonElement;
  overlaySlideMain: HTMLElement;
  overlaySlideScores: HTMLElement;
  overlayScoresList: HTMLElement;
  overlayScoresBtn: HTMLButtonElement;
  overlayBackBtn: HTMLButtonElement;
  /** Current title-dialog slide ("main" content vs high scores). */
  overlaySlide: OverlaySlide;
  /** Last phase we painted — used to reset the slide on phase change. */
  lastOverlayPhase: HudSnapshot["phase"] | null;
}

export function createHud(parent: HTMLElement): HudElements {
  parent.innerHTML = `
    <header class="hud-bar">
      <div class="hud-group">
        <span class="hud-label">Level</span>
        <span data-hud="level" class="hud-value">—</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Floor</span>
        <span data-hud="floor" class="hud-value">—</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Dots left</span>
        <span data-hud="dots" class="hud-value">0</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Humans</span>
        <span data-hud="ghosts" class="hud-value">0</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Time</span>
        <span data-hud="time" class="hud-value">0:00.0</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Score</span>
        <span data-hud="score" class="hud-value">0</span>
      </div>
    </header>
    <p data-hud="objective" class="objective"></p>
    <p data-hud="bait-banner" class="bait-banner hidden" role="status" aria-live="polite"></p>
    <dialog data-hud="overlay" class="overlay">
      <div data-hud="overlay-card" class="overlay-card">
        <div data-hud="slide-main" class="overlay-slide">
          <p data-hud="overlay-logo" class="overlay-logo hidden">Maze Chase</p>
          <h2 data-hud="overlay-title"></h2>
          <p data-hud="overlay-body"></p>
          <div data-hud="overlay-high-score" class="overlay-high-score hidden" role="status"></div>
          <form data-hud="overlay-name-form" class="overlay-name-form hidden">
            <label class="overlay-name-label">
              <span>Your name</span>
              <input data-hud="overlay-name-input" type="text" maxlength="12" autocomplete="nickname" enterkeyhint="done" />
            </label>
            <button type="submit" data-hud="overlay-name-submit" class="btn btn-accent">Save score</button>
          </form>
          <p data-hud="overlay-cta" class="overlay-cta hidden"></p>
          <p data-hud="overlay-hint" class="overlay-hint"></p>
          <button type="button" data-hud="scores-btn" class="btn overlay-nav-btn">High Scores</button>
        </div>
        <div data-hud="slide-scores" class="overlay-slide hidden">
          <p class="overlay-logo">Maze Chase</p>
          <h2>High Scores</h2>
          <p class="overlay-scores-blurb">Top 3 per level</p>
          <div data-hud="scores-list" class="overlay-scores-list"></div>
          <button type="button" data-hud="back-btn" class="btn overlay-nav-btn">Back</button>
        </div>
      </div>
    </dialog>
  `;

  const q = (sel: string) => parent.querySelector(sel) as HTMLElement;

  return {
    root: parent,
    level: q('[data-hud="level"]'),
    floor: q('[data-hud="floor"]'),
    dots: q('[data-hud="dots"]'),
    ghosts: q('[data-hud="ghosts"]'),
    time: q('[data-hud="time"]'),
    score: q('[data-hud="score"]'),
    objective: q('[data-hud="objective"]'),
    baitBanner: q('[data-hud="bait-banner"]'),
    overlay: q('[data-hud="overlay"]') as HTMLDialogElement,
    overlayCard: q('[data-hud="overlay-card"]'),
    overlayLogo: q('[data-hud="overlay-logo"]'),
    overlayTitle: q('[data-hud="overlay-title"]'),
    overlayBody: q('[data-hud="overlay-body"]'),
    overlayHint: q('[data-hud="overlay-hint"]'),
    overlayCta: q('[data-hud="overlay-cta"]'),
    overlayHighScore: q('[data-hud="overlay-high-score"]'),
    overlayNameForm: q('[data-hud="overlay-name-form"]'),
    overlayNameInput: q('[data-hud="overlay-name-input"]') as HTMLInputElement,
    overlayNameSubmit: q('[data-hud="overlay-name-submit"]') as HTMLButtonElement,
    overlaySlideMain: q('[data-hud="slide-main"]'),
    overlaySlideScores: q('[data-hud="slide-scores"]'),
    overlayScoresList: q('[data-hud="scores-list"]'),
    overlayScoresBtn: q('[data-hud="scores-btn"]') as HTMLButtonElement,
    overlayBackBtn: q('[data-hud="back-btn"]') as HTMLButtonElement,
    overlaySlide: "main",
    lastOverlayPhase: null,
  };
}

export interface HudUpdateOptions {
  /** When true, suppress phase overlays (e.g. info dialog is open). */
  suppressOverlay?: boolean;
  /** Pending / saved high-score state for the end screen. */
  highScore?: HighScorePrompt | null;
}

export function setOverlaySlide(els: HudElements, slide: OverlaySlide): void {
  els.overlaySlide = slide;
  els.overlaySlideMain.classList.toggle("hidden", slide !== "main");
  els.overlaySlideScores.classList.toggle("hidden", slide !== "scores");
}

export function renderHighScoresSlide(els: HudElements, currentLevelId: string): void {
  const board = getHighScoreBoard();
  const levels = listLevels();
  const seen = new Set<string>();
  const sections: string[] = [];

  const appendLevel = (id: string, name: string, entries: HighScoreEntry[]) => {
    if (seen.has(id)) return;
    seen.add(id);
    const rows =
      entries.length === 0
        ? `<li class="overlay-score-empty">No scores yet</li>`
        : entries
            .map(
              (entry, i) => `
            <li class="overlay-score-row">
              <span class="overlay-score-rank">#${i + 1}</span>
              <span class="overlay-score-name">${escapeHtml(entry.playerName)}</span>
              <span class="overlay-score-points">${entry.score}</span>
            </li>`,
            )
            .join("");
    sections.push(`
      <section class="overlay-score-level${id === currentLevelId ? " is-current" : ""}">
        <h3>${escapeHtml(name)}</h3>
        <ol>${rows}</ol>
      </section>
    `);
  };

  for (const level of levels) {
    appendLevel(level.id, level.name, board[level.id] ?? getHighScores(level.id));
  }
  for (const [id, entries] of Object.entries(board)) {
    if (seen.has(id)) continue;
    const name = entries[0]?.levelName ?? id;
    appendLevel(id, name, entries);
  }

  els.overlayScoresList.innerHTML =
    sections.join("") || `<p class="overlay-score-empty">No high scores yet.</p>`;
}

export function updateHud(
  els: HudElements,
  snap: HudSnapshot,
  options: HudUpdateOptions = {},
): void {
  els.level.textContent = snap.levelName;
  els.floor.textContent =
    snap.floorCount > 1
      ? `${snap.floorName} (${snap.floorIndex + 1}/${snap.floorCount})`
      : snap.floorName;
  els.dots.textContent = String(snap.dotsRemaining);
  els.ghosts.textContent = String(snap.ghostsRemaining);
  els.time.textContent = formatTime(snap.elapsedSeconds);
  els.score.textContent = String(snap.score);

  if (snap.baitRemaining > 0) {
    els.baitBanner.textContent = `BAIT ACTIVE — humans hunting! (${snap.baitRemaining.toFixed(1)}s)`;
    els.baitBanner.classList.remove("hidden");
  } else {
    els.baitBanner.textContent = "";
    els.baitBanner.classList.add("hidden");
  }

  if (!snap.allGhostsCaught) {
    els.objective.textContent =
      snap.floorCount > 1
        ? "Catch humans before they clear every dot. Lifts (^/v) are one-way — bait flips the hunt."
        : "Catch humans before they clear every dot. Blue bait flips the hunt — briefly.";
  } else {
    els.objective.textContent =
      snap.floorCount > 1
        ? "All humans caught! Use lifts if needed, then reach the glowing exit."
        : "All humans caught! Reach the glowing exit to finish.";
  }

  if (options.suppressOverlay) {
    hideOverlay(els);
    return;
  }

  if (snap.phase === "ready") {
    showOverlay(els, snap, {
      title: "Ready?",
      body: "Catch the humans before they eat every dot, then reach the green exit.\nTap ⓘ for tile info.",
      cta: "Tap here · swipe · or pad to start",
      hint: "ⓘ pause & info · R restart",
      variant: "start",
      highScore: null,
    });
  } else if (snap.phase === "paused") {
    showOverlay(els, snap, {
      title: "Paused",
      body: "Take a breath — the dots can wait.",
      hint: "Tap to continue · ⓘ for info",
      variant: "default",
      highScore: null,
    });
  } else if (snap.phase === "won") {
    showOverlay(els, snap, {
      title: "You win!",
      body: `Dots + gems + time bonus.\nFinal score: ${snap.score}\n(gems ${snap.bonusScore} · time ${snap.timeBonus})`,
      hint: "Press R or Restart to play again",
      variant: "default",
      highScore: options.highScore ?? null,
    });
  } else if (snap.phase === "lost") {
    const lose = loseCopy(snap.loseReason);
    showOverlay(els, snap, {
      title: lose.title,
      body: lose.body,
      hint: "Press R or Restart to try again",
      variant: "default",
      highScore: null,
    });
  } else {
    hideOverlay(els);
  }
}

function loseCopy(reason: HudSnapshot["loseReason"]): { title: string; body: string } {
  switch (reason) {
    case "ghost":
      return {
        title: "Caught!",
        body: "A hunting human got you while bait was active.",
      };
    case "trapdoor":
      return {
        title: "Trap door!",
        body: "You fell through an open pit.",
      };
    case "shock":
      return {
        title: "Zapped!",
        body: "A live shock plate fried you.",
      };
    case "dots":
    default:
      return {
        title: "Dots gone!",
        body: "The humans cleared the maze.\nCatch them before they finish every scrap.",
      };
  }
}

interface OverlayContent {
  title: string;
  body: string;
  hint: string;
  cta?: string;
  variant: "start" | "default";
  highScore: HighScorePrompt | null;
}

function showOverlay(els: HudElements, snap: HudSnapshot, content: OverlayContent): void {
  const phaseChanged = els.lastOverlayPhase !== snap.phase;
  if (phaseChanged) {
    els.lastOverlayPhase = snap.phase;
    setOverlaySlide(els, "main");
  }

  els.overlayCard.classList.toggle("overlay-card--start", content.variant === "start");
  els.overlayLogo.classList.toggle("hidden", content.variant !== "start");
  els.overlayTitle.textContent = content.title;
  els.overlayBody.textContent = content.body;
  els.overlayHint.textContent = content.hint;

  if (content.cta) {
    els.overlayCta.textContent = content.cta;
    els.overlayCta.classList.remove("hidden");
  } else {
    els.overlayCta.textContent = "";
    els.overlayCta.classList.add("hidden");
  }

  syncHighScorePrompt(els, content.highScore);

  if (els.overlaySlide === "scores") {
    renderHighScoresSlide(els, snap.levelId);
  }

  if (!els.overlay.open) {
    els.overlay.showModal();
  }
}

function syncHighScorePrompt(els: HudElements, prompt: HighScorePrompt | null): void {
  if (!prompt) {
    els.overlayHighScore.classList.add("hidden");
    els.overlayHighScore.textContent = "";
    els.overlayNameForm.classList.add("hidden");
    return;
  }

  els.overlayHighScore.classList.remove("hidden");
  if (prompt.submitted) {
    els.overlayHighScore.textContent = `High score saved! Rank #${prompt.rank}`;
    els.overlayNameForm.classList.add("hidden");
  } else {
    els.overlayHighScore.textContent = `New high score! Rank #${prompt.rank}`;
    els.overlayNameForm.classList.remove("hidden");
    if (document.activeElement !== els.overlayNameInput) {
      const preferred = prompt.playerName || getLastPlayerName();
      if (els.overlayNameInput.value !== preferred && !els.overlayNameInput.dataset.touched) {
        els.overlayNameInput.value = preferred;
      }
    }
  }
}

function hideOverlay(els: HudElements): void {
  if (els.overlay.open) {
    els.overlay.close();
  }
  els.overlayCard.classList.remove("overlay-card--start");
  els.overlayLogo.classList.add("hidden");
  els.overlayHighScore.classList.add("hidden");
  els.overlayNameForm.classList.add("hidden");
  els.lastOverlayPhase = null;
  setOverlaySlide(els, "main");
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}
