import type { Direction } from "../../core/types";
import type { InputManager } from "../../core/engine/Input";

const SWIPE_THRESHOLD_PX = 28;

/**
 * On-screen D-pad + swipe-on-maze controls for touch devices.
 */
export class TouchControls {
  private readonly input: InputManager;
  private readonly root: HTMLElement;
  private readonly swipeTarget: HTMLElement;
  private readonly cleanups: Array<() => void> = [];
  private swipeStart: { x: number; y: number } | null = null;
  private swipeMoved = false;

  constructor(input: InputManager, root: HTMLElement, swipeTarget: HTMLElement) {
    this.input = input;
    this.root = root;
    this.swipeTarget = swipeTarget;
  }

  attach(): () => void {
    this.root.innerHTML = `
      <div class="touch-controls" aria-label="Touch controls">
        <div class="touch-dpad" role="group" aria-label="Direction pad">
          <button type="button" class="touch-pad touch-pad-up" data-dir="up" aria-label="Up">▲</button>
          <button type="button" class="touch-pad touch-pad-left" data-dir="left" aria-label="Left">◀</button>
          <button type="button" class="touch-pad touch-pad-right" data-dir="right" aria-label="Right">▶</button>
          <button type="button" class="touch-pad touch-pad-down" data-dir="down" aria-label="Down">▼</button>
        </div>
      </div>
    `;

    this.root.querySelectorAll<HTMLButtonElement>("[data-dir]").forEach((btn) => {
      const dir = btn.dataset.dir as Direction;
      const press = (event: Event) => {
        event.preventDefault();
        this.input.setDirection(dir, true);
        btn.classList.add("active");
      };
      const release = () => btn.classList.remove("active");
      btn.addEventListener("pointerdown", press);
      btn.addEventListener("pointerup", release);
      btn.addEventListener("pointerleave", release);
      btn.addEventListener("pointercancel", release);
      this.cleanups.push(() => {
        btn.removeEventListener("pointerdown", press);
        btn.removeEventListener("pointerup", release);
        btn.removeEventListener("pointerleave", release);
        btn.removeEventListener("pointercancel", release);
      });
    });

    this.attachSwipe();

    return () => {
      for (const cleanup of this.cleanups) cleanup();
      this.cleanups.length = 0;
      this.root.replaceChildren();
    };
  }

  private attachSwipe(): void {
    const target = this.swipeTarget;

    const onDown = (event: PointerEvent) => {
      if (event.pointerType === "mouse" && event.button !== 0) return;
      this.swipeStart = { x: event.clientX, y: event.clientY };
      this.swipeMoved = false;
    };

    const onMove = (event: PointerEvent) => {
      if (!this.swipeStart) return;
      const dx = event.clientX - this.swipeStart.x;
      const dy = event.clientY - this.swipeStart.y;
      if (Math.hypot(dx, dy) < SWIPE_THRESHOLD_PX) return;

      const dir: Direction =
        Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : dy > 0 ? "down" : "up";
      this.input.setDirection(dir, true);
      this.swipeStart = { x: event.clientX, y: event.clientY };
      this.swipeMoved = true;
      event.preventDefault();
    };

    const onUp = (event: PointerEvent) => {
      if (!this.swipeStart) return;
      // Tap on maze starts the round when ready
      if (!this.swipeMoved) {
        this.input.requestStart();
      }
      this.swipeStart = null;
      this.swipeMoved = false;
      event.preventDefault();
    };

    target.addEventListener("pointerdown", onDown);
    target.addEventListener("pointermove", onMove);
    target.addEventListener("pointerup", onUp);
    target.addEventListener("pointercancel", onUp);
    this.cleanups.push(() => {
      target.removeEventListener("pointerdown", onDown);
      target.removeEventListener("pointermove", onMove);
      target.removeEventListener("pointerup", onUp);
      target.removeEventListener("pointercancel", onUp);
    });
  }
}
