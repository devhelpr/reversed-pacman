import type { Direction } from "../types";

const KEY_TO_DIRECTION: Record<string, Direction> = {
  ArrowUp: "up",
  ArrowDown: "down",
  ArrowLeft: "left",
  ArrowRight: "right",
  w: "up",
  W: "up",
  s: "down",
  S: "down",
  a: "left",
  A: "left",
  d: "right",
  D: "right",
};

function isEditableTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(target.closest("input, textarea, select, [contenteditable=true]"))
  );
}

/**
 * Tracks keyboard + programmatic (touch) movement intent.
 */
export class InputManager {
  private pressed = new Set<string>();
  private lastDirection: Direction = "none";
  private restartRequested = false;
  private pauseRequested = false;
  private startRequested = false;

  attach(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      // Let name fields / other form controls receive WASD, Enter, etc.
      if (isEditableTarget(event.target)) return;

      this.pressed.add(event.key);

      const dir = KEY_TO_DIRECTION[event.key];
      if (dir) {
        this.lastDirection = dir;
        this.startRequested = true;
        event.preventDefault();
      }

      if (event.key === " " || event.key === "Enter") {
        this.startRequested = true;
        event.preventDefault();
      }

      if (event.key === "r" || event.key === "R") {
        this.restartRequested = true;
      }
      if (event.key === "p" || event.key === "P" || event.key === "Escape") {
        this.pauseRequested = true;
      }
    };

    const onKeyUp = (event: KeyboardEvent) => {
      if (isEditableTarget(event.target)) return;
      this.pressed.delete(event.key);
    };

    target.addEventListener("keydown", onKeyDown);
    target.addEventListener("keyup", onKeyUp);

    return () => {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
    };
  }

  /** Direction the player currently wants to move. */
  getDesiredDirection(): Direction {
    for (const key of this.pressed) {
      const dir = KEY_TO_DIRECTION[key];
      if (dir) return dir;
    }
    return this.lastDirection;
  }

  /** Touch / on-screen pad: set held direction (and optionally start the round). */
  setDirection(direction: Direction, alsoStart = true): void {
    this.lastDirection = direction;
    if (alsoStart && direction !== "none") {
      this.startRequested = true;
    }
  }

  requestStart(): void {
    this.startRequested = true;
  }

  requestRestart(): void {
    this.restartRequested = true;
  }

  requestPause(): void {
    this.pauseRequested = true;
  }

  consumeRestart(): boolean {
    if (!this.restartRequested) return false;
    this.restartRequested = false;
    return true;
  }

  consumePause(): boolean {
    if (!this.pauseRequested) return false;
    this.pauseRequested = false;
    return true;
  }

  consumeStart(): boolean {
    if (!this.startRequested) return false;
    this.startRequested = false;
    return true;
  }

  clearDirection(): void {
    this.lastDirection = "none";
  }
}
