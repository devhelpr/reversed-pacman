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
  overlayCard: HTMLElement;
  overlayTitle: HTMLElement;
  overlayBody: HTMLElement;
  overlayHint: HTMLElement;
  overlayCta: HTMLElement;
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
      <div data-hud="overlay-card" class="overlay-card">
        <h2 data-hud="overlay-title"></h2>
        <p data-hud="overlay-body"></p>
        <p data-hud="overlay-cta" class="overlay-cta hidden"></p>
        <p data-hud="overlay-hint" class="overlay-hint"></p>
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
    overlayCard: q('[data-hud="overlay-card"]'),
    overlayTitle: q('[data-hud="overlay-title"]'),
    overlayBody: q('[data-hud="overlay-body"]'),
    overlayHint: q('[data-hud="overlay-hint"]'),
    overlayCta: q('[data-hud="overlay-cta"]'),
  };
}

export function updateHud(els: HudElements, snap: HudSnapshot): void {
  els.level.textContent = snap.levelName;
  els.dots.textContent = String(snap.dotsRemaining);
  els.ghosts.textContent = String(snap.ghostsRemaining);
  els.time.textContent = formatTime(snap.elapsedSeconds);
  els.score.textContent = String(snap.score);

  if (snap.baitRemaining > 0) {
    els.objective.textContent = `BAIT ACTIVE — ghosts are hunting you! (${snap.baitRemaining.toFixed(1)}s)`;
  } else if (!snap.allGhostsCaught) {
    els.objective.textContent = "Chase ghosts, avoid traps. Blue bait flips the hunt — briefly.";
  } else {
    els.objective.textContent = "All ghosts caught! Reach the glowing exit to finish.";
  }

  if (snap.phase === "ready") {
    showOverlay(els, {
      title: "Ready?",
      body: "Catch the 3 ghosts, then reach the green exit.\nUse the Legenda if a tile looks unfamiliar.",
      cta: "Press ←↑↓→ / WASD or Space to start",
      hint: "P pauses once the round begins",
      variant: "start",
    });
  } else if (snap.phase === "paused") {
    showOverlay(els, {
      title: "Paused",
      body: "Take a breath — the dots can wait.",
      hint: "Press P to continue",
      variant: "default",
    });
  } else if (snap.phase === "won") {
    showOverlay(els, {
      title: "You win!",
      body: `Dots left scored + time bonus (under 1 min).\nFinal score: ${snap.score} (bonus ${snap.timeBonus})`,
      hint: "Press R to play again",
      variant: "default",
    });
  } else if (snap.phase === "lost") {
    const lose = loseCopy(snap.loseReason);
    showOverlay(els, {
      title: lose.title,
      body: lose.body,
      hint: "Press R to try again",
      variant: "default",
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
        body: "A hunting ghost got you while bait was active.",
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
        body: "The ghosts ate everything.",
      };
  }
}

interface OverlayContent {
  title: string;
  body: string;
  hint: string;
  cta?: string;
  variant: "start" | "default";
}

function showOverlay(els: HudElements, content: OverlayContent): void {
  els.overlay.classList.remove("hidden");
  els.overlayCard.classList.toggle("overlay-card--start", content.variant === "start");
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
}

function hideOverlay(els: HudElements): void {
  els.overlay.classList.add("hidden");
  els.overlayCard.classList.remove("overlay-card--start");
}
