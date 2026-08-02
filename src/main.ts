import "./style.css";
import "./features/levels";
import { AppShell } from "./features/app/AppShell";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app mount point missing");
}

const shell = new AppShell(app);
void shell.start();
