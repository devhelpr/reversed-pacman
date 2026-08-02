import "./style.css";
import "./features/levels";
import { GameApp } from "./features/game/GameApp";

const app = document.querySelector<HTMLDivElement>("#app");
if (!app) {
  throw new Error("#app mount point missing");
}

const game = new GameApp({ mount: app });
game.start();
