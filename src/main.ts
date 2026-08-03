import "./style.css";
import "./features/levels";
import { AppShell } from "./features/app/AppShell";

/**
 * iOS Safari (10+) ignores viewport user-scalable/maximum-scale for a11y.
 * Block double-tap zoom and multi-finger pinch so game controls stay usable.
 */
function lockMobileViewportZoom(): void {
  let lastTouchEnd = 0;

  const isEditable = (target: EventTarget | null) =>
    target instanceof Element && Boolean(target.closest("input, textarea, select, [contenteditable=true]"));

  document.addEventListener(
    "touchend",
    (event) => {
      if (isEditable(event.target)) return;
      const now = Date.now();
      if (now - lastTouchEnd <= 350) {
        event.preventDefault();
      }
      lastTouchEnd = now;
    },
    { passive: false, capture: true },
  );

  document.addEventListener(
    "touchmove",
    (event) => {
      if (event.touches.length > 1) {
        event.preventDefault();
      }
    },
    { passive: false, capture: true },
  );

  for (const type of ["gesturestart", "gesturechange", "gestureend"] as const) {
    document.addEventListener(type, (event) => event.preventDefault(), { passive: false });
  }
}

lockMobileViewportZoom();

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app mount point missing");
}

const shell = new AppShell(app);
void shell.start();
