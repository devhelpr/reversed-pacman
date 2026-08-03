import "./style.css";
import "./features/levels";
import { AppShell } from "./features/app/AppShell";

/** Block iOS Safari gesture zoom so the page scale stays locked for touch controls. */
for (const type of ["gesturestart", "gesturechange", "gestureend"] as const) {
  document.addEventListener(type, (event) => event.preventDefault());
}

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app mount point missing");
}

const shell = new AppShell(app);
void shell.start();
