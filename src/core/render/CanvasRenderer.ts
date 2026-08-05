import type { Maze } from "../maze/Maze";
import type { Direction, GamePhase, LoseReason, TileKind, Vec2 } from "../types";
import {
  createBaitSprite,
  createBonusSprite,
  createDotSprite,
  createExitSprite,
  createFloorPattern,
  createGhostSprites,
  createLiftSprite,
  createPlayerSprites,
  createRiftSprite,
  createShockSprite,
  createSlimeSprite,
  createTrapdoorSprite,
  createWallPattern,
  ghostSpriteFor,
  GHOST_PALETTES,
  HUNTER_GHOST_PALETTE,
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
  hunted?: boolean;
  hunting?: boolean;
  /** 0..1 while falling into a trap door. */
  fallProgress?: number;
  /** 0..1 while riding a floor lift. */
  liftProgress?: number;
  liftDir?: "up" | "down";
}

export interface LiftTransition {
  progress: number;
  dir: "up" | "down";
}

export interface HudSnapshot {
  phase: GamePhase;
  dotsRemaining: number;
  ghostsRemaining: number;
  elapsedSeconds: number;
  score: number;
  timeBonus: number;
  bonusScore: number;
  bonusCollected: number;
  levelId: string;
  levelName: string;
  allGhostsCaught: boolean;
  baitRemaining: number;
  loseReason: LoseReason;
  floorName: string;
  floorIndex: number;
  floorCount: number;
}

export interface TrapdoorVisual {
  col: number;
  row: number;
  /** 0 = sealed hatch, 1 = fully open pit. */
  openAmount: number;
}

export interface TrapVisualState {
  trapdoors: TrapdoorVisual[];
  shocksLive: boolean;
  animPhase: number;
}

const TILE = 32;
const SPRITE = 28;
/** Prefer showing about this many tiles on the shorter viewport axis. */
const TARGET_VISIBLE_TILES = 11;
/** Start scrolling when the focus enters this many tiles of the viewport edge. */
const CAMERA_MARGIN_TILES = 2.5;
/** Exponential follow rate (higher = snappier). */
const CAMERA_LERP = 14;

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
  private readonly hunterGhostSprites: HTMLCanvasElement[];
  private readonly dotSprite: HTMLCanvasElement;
  private readonly wallSprite: HTMLCanvasElement;
  private readonly floorSprite: HTMLCanvasElement;
  private readonly baitSprites: HTMLCanvasElement[];
  private readonly bonusSprites: HTMLCanvasElement[];
  private readonly trapdoorClosed: HTMLCanvasElement;
  private readonly trapdoorOpen: HTMLCanvasElement;
  private readonly slimeSprites: HTMLCanvasElement[];
  private readonly shockIdle: HTMLCanvasElement;
  private readonly shockLive: HTMLCanvasElement;
  private readonly riftSprites: HTMLCanvasElement[];
  private readonly liftUpSprites: HTMLCanvasElement[];
  private readonly liftDownSprites: HTMLCanvasElement[];
  private exitFrame = 0;
  private exitSprites: HTMLCanvasElement[];
  private trapAnim = 0;

  private tileSize = TILE;
  private mazePixelW = 0;
  private mazePixelH = 0;
  private viewW = 0;
  private viewH = 0;
  private camX = 0;
  private camY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext("2d")!;
    this.ctx.imageSmoothingEnabled = false;

    this.buffer = document.createElement("canvas");
    this.bctx = this.buffer.getContext("2d")!;
    this.bctx.imageSmoothingEnabled = false;

    this.playerSprites = createPlayerSprites();
    this.ghostSprites = GHOST_PALETTES.map((p) => createGhostSprites(p));
    this.hunterGhostSprites = createGhostSprites(HUNTER_GHOST_PALETTE);
    this.dotSprite = createDotSprite();
    this.wallSprite = createWallPattern();
    this.floorSprite = createFloorPattern();
    this.exitSprites = [createExitSprite(0), createExitSprite(1)];
    this.baitSprites = [createBaitSprite(0), createBaitSprite(1)];
    this.bonusSprites = [createBonusSprite(0), createBonusSprite(1)];
    this.trapdoorClosed = createTrapdoorSprite(false);
    this.trapdoorOpen = createTrapdoorSprite(true);
    this.slimeSprites = [createSlimeSprite(0), createSlimeSprite(1)];
    this.shockIdle = createShockSprite(false);
    this.shockLive = createShockSprite(true);
    this.riftSprites = [createRiftSprite(0), createRiftSprite(1)];
    this.liftUpSprites = [createLiftSprite("up", 0), createLiftSprite("up", 1)];
    this.liftDownSprites = [createLiftSprite("down", 0), createLiftSprite("down", 1)];
  }

  resizeForMaze(maze: Maze, maxCssWidth: number, maxCssHeight: number): void {
    const pixelW = maze.width * this.tileSize;
    const pixelH = maze.height * this.tileSize;
    this.buffer.width = pixelW;
    this.buffer.height = pixelH;
    this.mazePixelW = pixelW;
    this.mazePixelH = pixelH;

    const targetVisible = Math.min(TARGET_VISIBLE_TILES, maze.width, maze.height);
    const scale = Math.max(
      1,
      Math.floor(Math.min(maxCssWidth, maxCssHeight) / (targetVisible * this.tileSize)),
    );

    const viewW = Math.min(pixelW, Math.floor(maxCssWidth / scale));
    const viewH = Math.min(pixelH, Math.floor(maxCssHeight / scale));
    this.viewW = Math.max(this.tileSize, viewW);
    this.viewH = Math.max(this.tileSize, viewH);

    this.canvas.width = this.viewW * scale;
    this.canvas.height = this.viewH * scale;
    this.canvas.style.width = `${this.viewW * scale}px`;
    this.canvas.style.height = `${this.viewH * scale}px`;
    this.ctx.imageSmoothingEnabled = false;

    this.camX = this.clampCamX(this.camX);
    this.camY = this.clampCamY(this.camY);
  }

  /**
   * Keep `focus` (tile units) inset from the viewport edge; lerp unless `snap`.
   */
  updateCamera(focus: Vec2, dt = 0, snap = false): void {
    const desired = this.desiredCamera(focus);
    if (snap || dt <= 0) {
      this.camX = desired.x;
      this.camY = desired.y;
      return;
    }
    const t = 1 - Math.exp(-CAMERA_LERP * dt);
    this.camX += (desired.x - this.camX) * t;
    this.camY += (desired.y - this.camY) * t;
    this.camX = this.clampCamX(this.camX);
    this.camY = this.clampCamY(this.camY);
  }

  private desiredCamera(focus: Vec2): Vec2 {
    const tw = this.tileSize;
    const fx = focus.x * tw;
    const fy = focus.y * tw;
    const margin = CAMERA_MARGIN_TILES * tw;

    let x = this.camX;
    let y = this.camY;

    if (this.mazePixelW <= this.viewW) {
      x = (this.mazePixelW - this.viewW) / 2;
    } else {
      const left = x + margin;
      const right = x + this.viewW - margin;
      if (fx < left) x = fx - margin;
      else if (fx > right) x = fx - (this.viewW - margin);
      x = this.clampCamX(x);
    }

    if (this.mazePixelH <= this.viewH) {
      y = (this.mazePixelH - this.viewH) / 2;
    } else {
      const top = y + margin;
      const bottom = y + this.viewH - margin;
      if (fy < top) y = fy - margin;
      else if (fy > bottom) y = fy - (this.viewH - margin);
      y = this.clampCamY(y);
    }

    return { x, y };
  }

  private clampCamX(x: number): number {
    if (this.mazePixelW <= this.viewW) return (this.mazePixelW - this.viewW) / 2;
    return Math.max(0, Math.min(x, this.mazePixelW - this.viewW));
  }

  private clampCamY(y: number): number {
    if (this.mazePixelH <= this.viewH) return (this.mazePixelH - this.viewH) / 2;
    return Math.max(0, Math.min(y, this.mazePixelH - this.viewH));
  }

  advanceAnim(dt: number): void {
    this.exitFrame += dt * 4;
    this.trapAnim += dt * 3;
  }

  render(
    maze: Maze,
    actors: RenderableActor[],
    traps: TrapVisualState,
    floorIndex = 0,
    liftTransition: LiftTransition | null = null,
  ): void {
    const ctx = this.bctx;
    const tw = this.tileSize;
    const anim = Math.floor(this.trapAnim);
    const doorLookup = new Map(
      traps.trapdoors.map((d) => [`${d.col},${d.row}`, d.openAmount] as const),
    );

    ctx.fillStyle = "#0A0C12";
    ctx.fillRect(0, 0, this.buffer.width, this.buffer.height);

    // Subtle floor slide while riding a lift
    const liftSlide =
      liftTransition != null
        ? Math.sin(Math.min(1, Math.max(0, liftTransition.progress)) * Math.PI) *
          tw *
          0.55 *
          (liftTransition.dir === "up" ? 1 : -1)
        : 0;

    ctx.save();
    if (liftSlide !== 0) {
      ctx.translate(0, liftSlide);
    }

    const tiles = maze.snapshotTiles(floorIndex);
    for (let row = 0; row < maze.height; row++) {
      for (let col = 0; col < maze.width; col++) {
        const tile = tiles[row]![col]!;
        const x = col * tw;
        const y = row * tw;

        if (tile === "wall") {
          ctx.drawImage(this.wallSprite, x, y, tw, tw);
          this.drawWallPipes(ctx, tiles, col, row, x, y, tw);
          continue;
        }

        ctx.drawImage(this.floorSprite, x, y, tw, tw);

        switch (tile) {
          case "dot":
            this.drawCentered(ctx, this.dotSprite, x, y, tw);
            break;
          case "bait":
            this.drawCentered(ctx, this.baitSprites[anim % this.baitSprites.length]!, x, y, tw);
            break;
          case "bonus":
            this.drawCentered(ctx, this.bonusSprites[anim % this.bonusSprites.length]!, x, y, tw);
            break;
          case "trapdoor": {
            const openAmount = doorLookup.get(`${col},${row}`) ?? 0;
            this.drawTrapdoor(ctx, x, y, tw, openAmount);
            break;
          }
          case "slime":
            ctx.drawImage(this.slimeSprites[anim % this.slimeSprites.length]!, x, y);
            break;
          case "shock":
            this.drawCentered(ctx, traps.shocksLive ? this.shockLive : this.shockIdle, x, y, tw);
            break;
          case "rift":
            this.drawCentered(ctx, this.riftSprites[anim % this.riftSprites.length]!, x, y, tw);
            break;
          case "liftUp":
            this.drawCentered(ctx, this.liftUpSprites[anim % this.liftUpSprites.length]!, x, y, tw);
            break;
          case "liftDown":
            this.drawCentered(
              ctx,
              this.liftDownSprites[anim % this.liftDownSprites.length]!,
              x,
              y,
              tw,
            );
            break;
          case "exit": {
            const sprite = this.exitSprites[Math.floor(this.exitFrame) % this.exitSprites.length]!;
            this.drawCentered(ctx, sprite, x, y, tw);
            break;
          }
          default:
            break;
        }
      }
    }

    for (const actor of actors) {
      if (!actor.alive && !(actor.fallProgress !== undefined && actor.fallProgress < 1)) {
        continue;
      }
      if (actor.fallProgress !== undefined && actor.fallProgress >= 1) continue;

      const fall = actor.fallProgress ?? 0;
      const lift = actor.liftProgress;
      const liftDir = actor.liftDir ?? "up";
      let scale = actor.kind === "player" && fall > 0 ? 1 - fall * 0.85 : 1;
      let sink = actor.kind === "player" && fall > 0 ? fall * tw * 0.7 : 0;
      let alpha = 1;

      if (actor.kind === "player" && lift !== undefined) {
        const half = lift < 0.5 ? lift * 2 : (lift - 0.5) * 2;
        scale = lift < 0.5 ? 1 - half * 0.85 : 0.15 + half * 0.85;
        const travel = lift < 0.5 ? -half : 1 - half;
        sink = (liftDir === "up" ? travel : -travel) * tw * 1.35;
        alpha = lift < 0.5 ? 1 - half * 0.45 : 0.55 + half * 0.45;
      }

      const px = actor.worldPos.x * tw - (SPRITE * scale) / 2;
      const py = actor.worldPos.y * tw - (SPRITE * scale) / 2 + sink;

      if (actor.kind === "player") {
        if (actor.hunted && fall === 0 && lift === undefined) {
          ctx.fillStyle = "#4B8CFF66";
          ctx.beginPath();
          ctx.arc(actor.worldPos.x * tw, actor.worldPos.y * tw, 18, 0, Math.PI * 2);
          ctx.fill();
        }

        const sprite = playerSpriteFor(this.playerSprites, actor.direction, actor.animFrame);
        if (fall > 0) {
          // Clip into the pit as they sink
          ctx.save();
          const tileX = Math.floor(actor.worldPos.x) * tw;
          const tileY = Math.floor(actor.worldPos.y) * tw;
          ctx.beginPath();
          ctx.rect(tileX + 4, tileY + 4, tw - 8, tw - 8);
          ctx.clip();
          ctx.globalAlpha = 1 - fall * 0.35;
          ctx.drawImage(sprite, px, py, SPRITE * scale, SPRITE * scale);
          ctx.restore();
        } else if (lift !== undefined) {
          ctx.save();
          ctx.globalAlpha = alpha;
          ctx.drawImage(sprite, px, py, SPRITE * scale, SPRITE * scale);
          ctx.restore();
        } else {
          ctx.drawImage(sprite, px, py);
        }
      } else {
        const frames = actor.hunting
          ? this.hunterGhostSprites
          : this.ghostSprites[(actor.ghostIndex ?? 0) % this.ghostSprites.length]!;
        const sprite = ghostSpriteFor(frames, actor.animFrame, actor.direction);
        ctx.drawImage(sprite, px, py);
      }
    }

    ctx.restore();

    if (liftTransition) {
      this.drawLiftWipe(ctx, liftTransition);
    }

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.imageSmoothingEnabled = false;

    // Integer source rect keeps nearest-neighbor scaling crisp while the camera lerps.
    let sx = Math.round(this.camX);
    let sy = Math.round(this.camY);
    if (this.mazePixelW > this.viewW) {
      sx = Math.max(0, Math.min(sx, this.mazePixelW - this.viewW));
    }
    if (this.mazePixelH > this.viewH) {
      sy = Math.max(0, Math.min(sy, this.mazePixelH - this.viewH));
    }

    this.ctx.drawImage(
      this.buffer,
      sx,
      sy,
      this.viewW,
      this.viewH,
      0,
      0,
      this.canvas.width,
      this.canvas.height,
    );
  }

  /** Center a sprite inside a tile. */
  private drawCentered(
    ctx: CanvasRenderingContext2D,
    sprite: HTMLCanvasElement,
    tileX: number,
    tileY: number,
    tw: number,
  ): void {
    ctx.drawImage(sprite, tileX + (tw - sprite.width) / 2, tileY + (tw - sprite.height) / 2);
  }

  /**
   * Perimeter metal pipes around wall masses.
   * Straight runs meet rounded elbows so corners flow continuously.
   */
  private drawWallPipes(
    ctx: CanvasRenderingContext2D,
    tiles: readonly (readonly TileKind[])[],
    col: number,
    row: number,
    x: number,
    y: number,
    tw: number,
  ): void {
    const isWall = (c: number, r: number): boolean => {
      const t = tiles[r]?.[c];
      // Out of bounds counts as wall so outer maze rim stays solid
      return t === undefined || t === "wall";
    };

    const n = isWall(col, row - 1);
    const e = isWall(col + 1, row);
    const s = isWall(col, row + 1);
    const w = isWall(col - 1, row);
    const ne = isWall(col + 1, row - 1);
    const nw = isWall(col - 1, row - 1);
    const se = isWall(col + 1, row + 1);
    const sw = isWall(col - 1, row + 1);

    const P = Math.max(6, Math.floor(tw * 0.42)); // chunkier C64-style pipe

    // Outer corners first so straights can abut cleanly
    if (!n && !w) this.fillPipeElbow(ctx, x, y, P, "nw");
    if (!n && !e) this.fillPipeElbow(ctx, x + tw - P, y, P, "ne");
    if (!s && !w) this.fillPipeElbow(ctx, x, y + tw - P, P, "sw");
    if (!s && !e) this.fillPipeElbow(ctx, x + tw - P, y + tw - P, P, "se");

    // Straight runs — inset by P on ends that have an outer elbow
    if (!n) {
      const x0 = x + (!w ? P : 0);
      const x1 = x + tw - (!e ? P : 0);
      if (x1 > x0) this.fillPipeH(ctx, x0, y, x1 - x0, P, false);
    }
    if (!s) {
      const x0 = x + (!w ? P : 0);
      const x1 = x + tw - (!e ? P : 0);
      if (x1 > x0) this.fillPipeH(ctx, x0, y + tw - P, x1 - x0, P, true);
    }
    if (!w) {
      const y0 = y + (!n ? P : 0);
      const y1 = y + tw - (!s ? P : 0);
      if (y1 > y0) this.fillPipeV(ctx, x, y0, P, y1 - y0, false);
    }
    if (!e) {
      const y0 = y + (!n ? P : 0);
      const y1 = y + tw - (!s ? P : 0);
      if (y1 > y0) this.fillPipeV(ctx, x + tw - P, y0, P, y1 - y0, true);
    }

    // Inner (concave) corners — pipe wraps into the notch
    if (n && w && !nw) this.fillPipeInner(ctx, x, y, P, "nw");
    if (n && e && !ne) this.fillPipeInner(ctx, x + tw - P, y, P, "ne");
    if (s && w && !sw) this.fillPipeInner(ctx, x, y + tw - P, P, "sw");
    if (s && e && !se) this.fillPipeInner(ctx, x + tw - P, y + tw - P, P, "se");
  }

  /** Horizontal pipe band; `flip` = south face (corridor below). */
  private fillPipeH(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    flip: boolean,
  ): void {
    for (let i = 0; i < h; i++) {
      const t = (i + 0.5) / h;
      // Corridor side is dark: north → top rows, south → bottom rows
      const u = flip ? t : 1 - t;
      ctx.fillStyle = this.pipeShade(u);
      ctx.fillRect(x, y + i, w, 1);
    }
  }

  /** Vertical pipe band; `flip` = east face (corridor right). */
  private fillPipeV(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    w: number,
    h: number,
    flip: boolean,
  ): void {
    for (let i = 0; i < w; i++) {
      const t = (i + 0.5) / w;
      const u = flip ? t : 1 - t;
      ctx.fillStyle = this.pipeShade(u);
      ctx.fillRect(x + i, y, 1, h);
    }
  }

  /**
   * Outer elbow — fuller quarter-pipe with floor punch outside the arc
   * so corners read rounder (no square light tips).
   */
  private fillPipeElbow(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    p: number,
    corner: "nw" | "ne" | "sw" | "se",
  ): void {
    const floor = "#0A0C12";
    // Slightly generous radius keeps the bend looking round against straights
    const rMax = p - 0.15;
    for (let py = 0; py < p; py++) {
      for (let px = 0; px < p; px++) {
        const sx = corner === "nw" || corner === "sw" ? p - 0.5 - px : px + 0.5;
        const sy = corner === "nw" || corner === "ne" ? p - 0.5 - py : py + 0.5;
        const dist = Math.sqrt(sx * sx + sy * sy);
        if (dist > rMax) {
          ctx.fillStyle = floor;
          ctx.fillRect(x + px, y + py, 1, 1);
          continue;
        }
        // Quantize along the radius for chunky concentric bands
        ctx.fillStyle = this.pipeShade(dist / rMax);
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }

  /** Inner elbow — concave wrap with the same banded shading. */
  private fillPipeInner(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    p: number,
    corner: "nw" | "ne" | "sw" | "se",
  ): void {
    const rMax = p - 0.15;
    for (let py = 0; py < p; py++) {
      for (let px = 0; px < p; px++) {
        const sx = corner === "nw" || corner === "sw" ? px + 0.5 : p - 0.5 - px;
        const sy = corner === "nw" || corner === "ne" ? py + 0.5 : p - 0.5 - py;
        const dist = Math.sqrt(sx * sx + sy * sy);
        if (dist > rMax) continue;
        ctx.fillStyle = this.pipeShade(1 - dist / rMax);
        ctx.fillRect(x + px, y + py, 1, 1);
      }
    }
  }

  /**
   * C64-style metal bands: dark on the corridor rim → softer steel inward.
   * Hard steps (no soft lerp) for a rough pixel look; inner band == WALL_FILL.
   */
  private pipeShade(u: number): string {
    const t = Math.min(1, Math.max(0, u));
    // 4 equal bands — outer → inner
    const bands = [
      "#6A8AB0", // inner (== WALL_FILL, no seam jump)
      "#4A6A90",
      "#2E4868",
      "#182838", // outer rim
    ];
    const i = Math.min(bands.length - 1, Math.floor(t * bands.length));
    return bands[i]!;
  }

  /** Horizontal shutter + flash while changing floors. */
  private drawLiftWipe(ctx: CanvasRenderingContext2D, lift: LiftTransition): void {
    const t = Math.min(1, Math.max(0, lift.progress));
    const peak = Math.sin(t * Math.PI); // 0 → 1 → 0
    const w = this.buffer.width;
    const h = this.buffer.height;
    const band = Math.floor(h * 0.42 * peak);

    ctx.save();
    ctx.fillStyle = `rgba(20, 17, 14, ${0.2 + peak * 0.65})`;
    ctx.fillRect(0, 0, w, h);

    ctx.fillStyle = lift.dir === "up" ? "#3DFFB5" : "#F0B429";
    ctx.globalAlpha = 0.35 + peak * 0.45;
    if (lift.dir === "up") {
      ctx.fillRect(0, 0, w, band);
      ctx.fillRect(0, h - band, w, band);
    } else {
      ctx.fillRect(0, h - band, w, band);
      ctx.fillRect(0, 0, w, band);
    }

    // Center streak in travel direction
    ctx.globalAlpha = peak * 0.55;
    ctx.fillStyle = "#f4efe6";
    const streakY = lift.dir === "up" ? h * (1 - t) : h * t;
    ctx.fillRect(0, streakY - 1, w, 2);

    // Tiny arrow cue
    ctx.globalAlpha = 0.7 + peak * 0.3;
    ctx.fillStyle = lift.dir === "up" ? "#3DFFB5" : "#F0B429";
    const cx = w / 2;
    const cy = h / 2;
    ctx.beginPath();
    if (lift.dir === "up") {
      ctx.moveTo(cx, cy - 10 - peak * 6);
      ctx.lineTo(cx + 8, cy + 4);
      ctx.lineTo(cx - 8, cy + 4);
    } else {
      ctx.moveTo(cx, cy + 10 + peak * 6);
      ctx.lineTo(cx + 8, cy - 4);
      ctx.lineTo(cx - 8, cy - 4);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /** Draw closed hatch, open pit, or a sliding blend between them. */
  private drawTrapdoor(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    tw: number,
    openAmount: number,
  ): void {
    if (openAmount <= 0.02) {
      ctx.drawImage(this.trapdoorClosed, x, y, tw, tw);
      return;
    }
    if (openAmount >= 0.98) {
      ctx.drawImage(this.trapdoorOpen, x, y, tw, tw);
      return;
    }

    // Pit underneath
    ctx.drawImage(this.trapdoorOpen, x, y, tw, tw);
    // Hatch slides downward / shrinks as it opens
    const hatchH = Math.max(1, Math.floor(tw * (1 - openAmount)));
    ctx.drawImage(
      this.trapdoorClosed,
      0,
      0,
      this.trapdoorClosed.width,
      Math.max(1, Math.floor(this.trapdoorClosed.height * (1 - openAmount))),
      x,
      y,
      tw,
      hatchH,
    );
  }
}
