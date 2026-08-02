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

/**
 * Tracks pressed keys and exposes the latest movement intent.
 * Extendable for gamepad / touch later.
 */
export class InputManager {
  private pressed = new Set<string>();
  private lastDirection: Direction = "none";
  private restartRequested = false;
  private pauseRequested = false;

  attach(target: Window = window): () => void {
    const onKeyDown = (event: KeyboardEvent) => {
      this.pressed.add(event.key);

      const dir = KEY_TO_DIRECTION[event.key];
      if (dir) {
        this.lastDirection = dir;
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

  clearDirection(): void {
    this.lastDirection = "none";
  }
}
