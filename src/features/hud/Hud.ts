import type { HudSnapshot } from "../../core/render/CanvasRenderer";

export function formatTime(seconds: number): string {
  const s = Math.max(0, seconds);
  const m = Math.floor(s / 60);
  const rem = Math.floor(s % 60);
  const ms = Math.floor((s % 1) * 10);
  return `${m}:${rem.toString().padStart(2, "0")}.${ms}`;
}

export interface HudElements {
  root: HTMLElement;
  level: HTMLElement;
  dots: HTMLElement;
  ghosts: HTMLElement;
  time: HTMLElement;
  score: HTMLElement;
  objective: HTMLElement;
  overlay: HTMLElement;
  overlayTitle: HTMLElement;
  overlayBody: HTMLElement;
}

export function createHud(parent: HTMLElement): HudElements {
  parent.innerHTML = `
    <header class="hud-bar">
      <div class="hud-group">
        <span class="hud-label">Level</span>
        <span data-hud="level" class="hud-value">—</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Dots left</span>
        <span data-hud="dots" class="hud-value">0</span>
      </div>
      <div class="hud-group">
        <span class="hud-label">Ghosts</span>
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
    <div data-hud="overlay" class="overlay hidden">
      <div class="overlay-card">
        <h2 data-hud="overlay-title"></h2>
        <p data-hud="overlay-body"></p>
        <p class="overlay-hint">Press <kbd>R</kbd> to restart · <kbd>P</kbd> pause</p>
      </div>
    </div>
  `;

  const q = (sel: string) => parent.querySelector(sel) as HTMLElement;

  return {
    root: parent,
    level: q('[data-hud="level"]'),
    dots: q('[data-hud="dots"]'),
    ghosts: q('[data-hud="ghosts"]'),
    time: q('[data-hud="time"]'),
    score: q('[data-hud="score"]'),
    objective: q('[data-hud="objective"]'),
    overlay: q('[data-hud="overlay"]'),
    overlayTitle: q('[data-hud="overlay-title"]'),
    overlayBody: q('[data-hud="overlay-body"]'),
  };
}

export function updateHud(els: HudElements, snap: HudSnapshot): void {
  els.level.textContent = snap.levelName;
  els.dots.textContent = String(snap.dotsRemaining);
  els.ghosts.textContent = String(snap.ghostsRemaining);
  els.time.textContent = formatTime(snap.elapsedSeconds);
  els.score.textContent = String(snap.score);

  if (!snap.allGhostsCaught) {
    els.objective.textContent = "Chase every ghost before they eat the dots. You cannot eat dots.";
  } else {
    els.objective.textContent = "All ghosts caught! Reach the glowing exit to finish.";
  }

  if (snap.phase === "ready") {
    showOverlay(
      els,
      "Reversed Pac-Man",
      "Catch the ghosts, save the dots, then reach the exit.\nArrow keys / WASD to move.",
    );
  } else if (snap.phase === "paused") {
    showOverlay(els, "Paused", "Press P to continue.");
  } else if (snap.phase === "won") {
    showOverlay(
      els,
      "You win!",
      `Dots left scored + time bonus (under 1 min).\nFinal score: ${snap.score} (bonus ${snap.timeBonus})`,
    );
  } else if (snap.phase === "lost") {
    showOverlay(els, "Dots gone!", "The ghosts ate everything. Press R to try again.");
  } else {
    hideOverlay(els);
  }
}

function showOverlay(els: HudElements, title: string, body: string): void {
  els.overlay.classList.remove("hidden");
  els.overlayTitle.textContent = title;
  els.overlayBody.textContent = body;
}

function hideOverlay(els: HudElements): void {
  els.overlay.classList.add("hidden");
}
