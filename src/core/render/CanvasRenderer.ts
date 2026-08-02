import type { Maze } from "../maze/Maze";
import type { Direction, GamePhase, Vec2 } from "../types";
import {
  createDotSprite,
  createExitSprite,
  createGhostSprites,
  createPlayerSprites,
  createWallPattern,
  ghostSpriteFor,
  GHOST_PALETTES,
  playerSpriteFor,
  type PlayerSpriteSet,
} from "./Sprites";

export interface RenderableActor {
  worldPos: Vec2;
  direction: Direction;
  animFrame: number;
  kind: "player" | "ghost";
  ghostIndex?: number;
  alive: boolean;
}

export interface HudSnapshot {
  phase: GamePhase;
  dotsRemaining: number;
  ghostsRemaining: number;
  elapsedSeconds: number;
  score: number;
  timeBonus: number;
  levelName: string;
  allGhostsCaught: boolean;
}

const TILE = 16;
const SPRITE = 14;

/**
 * Pixel-art canvas renderer. Scales the internal buffer for crisp pixels.
 */
export class CanvasRenderer {
  readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly buffer: HTMLCanvasElement;
  private readonly bctx: CanvasRenderingContext2D;

  private readonly playerSprites: PlayerSpriteSet;
  private readonly ghostSprites: HTMLCanvasElement[][];
  private readonly dotSprite: HTMLCanvasElement;
  private readonly wallSprite: HTMLCanvasElement;
  private exitFrame = 0;
  private exitSprites: HTMLCanvasElement[];

  private tileSize = TILE;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    this.buffer = document.createElement("canvas");
    this.bctx = this.buffer.getContext("2d")!;
    this.bctx.imageSmoothingEnabled = false;

    this.playerSprites = createPlayerSprites();
    this.ghostSprites = GHOST_PALETTES.map((p) => createGhostSprites(p));
    this.dotSprite = createDotSprite();
    this.wallSprite = createWallPattern();
    this.exitSprites = [createExitSprite(0), createExitSprite(1)];
  }

  resizeForMaze(maze: Maze, maxCssWidth: number, maxCssHeight: number): void {
    const pixelW = maze.width * this.tileSize;
    const pixelH = maze.height * this.tileSize;
    this.buffer.width = pixelW;
    this.buffer.height = pixelH;

    const scale = Math.max(1, Math.floor(Math.min(maxCssWidth / pixelW, maxCssHeight / pixelH)));

    this.canvas.width = pixelW * scale;
    this.canvas.height = pixelH * scale;
    this.canvas.style.width = `${pixelW * scale}px`;
    this.canvas.style.height = `${pixelH * scale}px`;
    this.ctx.imageSmoothingEnabled = false;
  }

  advanceAnim(dt: number): void {
    this.exitFrame += dt * 4;
  }

  render(maze: Maze, actors: RenderableActor[]): void {
    const ctx = this.bctx;
    const tw = this.tileSize;

    ctx.fillStyle = "#050510";
    ctx.fillRect(0, 0, this.buffer.width, this.buffer.height);

    const tiles = maze.snapshotTiles();
    for (let row = 0; row < maze.height; row++) {
      for (let col = 0; col < maze.width; col++) {
        const tile = tiles[row]![col]!;
        const x = col * tw;
        const y = row * tw;

        if (tile === "wall") {
          ctx.drawImage(this.wallSprite, x, y, tw, tw);
          // outer bevel
          ctx.strokeStyle = "#6B8CFF";
          ctx.lineWidth = 1;
          ctx.strokeRect(x + 0.5, y + 0.5, tw - 1, tw - 1);
        } else {
          ctx.fillStyle = "#0A0A1A";
          ctx.fillRect(x, y, tw, tw);

          if (tile === "dot") {
            const dx = x + (tw - 6) / 2;
            const dy = y + (tw - 6) / 2;
            ctx.drawImage(this.dotSprite, dx, dy);
          }

          if (tile === "exit") {
            const sprite = this.exitSprites[Math.floor(this.exitFrame) % this.exitSprites.length]!;
            const dx = x + (tw - 8) / 2;
            const dy = y + (tw - 8) / 2;
            ctx.drawImage(sprite, dx, dy);
          }
        }
      }
    }

    for (const actor of actors) {
      if (!actor.alive) continue;
      const px = actor.worldPos.x * tw - SPRITE / 2;
      const py = actor.worldPos.y * tw - SPRITE / 2;

      if (actor.kind === "player") {
        const sprite = playerSpriteFor(this.playerSprites, actor.direction, actor.animFrame);
        ctx.drawImage(sprite, px, py);
      } else {
        const idx = (actor.ghostIndex ?? 0) % this.ghostSprites.length;
        const frames = this.ghostSprites[idx]!;
        const sprite = ghostSpriteFor(frames, actor.animFrame, actor.direction);
        ctx.drawImage(sprite, px, py);
      }
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;
    this.ctx.drawImage(this.buffer, 0, 0, this.canvas.width, this.canvas.height);
  }
}
