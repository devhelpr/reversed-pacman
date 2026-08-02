import type { Direction, GridPos, TileKind } from "../types";
import { DIRECTION_VECTORS } from "../types";
import type { ParsedMaze } from "./LevelDefinition";

const WALKABLE: ReadonlySet<TileKind> = new Set([
  "path",
  "dot",
  "exit",
  "bait",
  "trapdoor",
  "slime",
  "shock",
  "rift",
]);

/**
 * Mutable tile map for a loaded maze. Ghosts remove dots at runtime;
 * the player can remove bait tiles.
 */
export class Maze {
  readonly width: number;
  readonly height: number;
  readonly playerStart: GridPos;
  readonly ghostStarts: GridPos[];
  readonly exit: GridPos;
  readonly initialDotCount: number;
  readonly trapdoorPositions: GridPos[];
  readonly shockPositions: GridPos[];
  readonly riftPositions: GridPos[];

  private tiles: TileKind[][];
  private dotCount: number;

  constructor(parsed: ParsedMaze) {
    this.width = parsed.width;
    this.height = parsed.height;
    this.playerStart = { ...parsed.playerStart };
    this.ghostStarts = parsed.ghostStarts.map((g) => ({ ...g }));
    this.exit = { ...parsed.exit };
    this.initialDotCount = parsed.initialDotCount;
    this.trapdoorPositions = parsed.trapdoorPositions.map((p) => ({ ...p }));
    this.shockPositions = parsed.shockPositions.map((p) => ({ ...p }));
    this.riftPositions = parsed.riftPositions.map((p) => ({ ...p }));
    this.tiles = parsed.tiles.map((row) => [...row]);
    this.dotCount = parsed.initialDotCount;
  }

  getDotsRemaining(): number {
    return this.dotCount;
  }

  getTile(col: number, row: number): TileKind {
    if (!this.inBounds(col, row)) return "wall";
    return this.tiles[row]![col]!;
  }

  inBounds(col: number, row: number): boolean {
    return col >= 0 && col < this.width && row >= 0 && row < this.height;
  }

  isWalkable(col: number, row: number): boolean {
    return WALKABLE.has(this.getTile(col, row));
  }

  hasDot(col: number, row: number): boolean {
    return this.getTile(col, row) === "dot";
  }

  hasBait(col: number, row: number): boolean {
    return this.getTile(col, row) === "bait";
  }

  /** Remove a scoreable yellow dot if present. */
  eatDot(col: number, row: number): boolean {
    if (!this.hasDot(col, row)) return false;
    this.tiles[row]![col] = "path";
    this.dotCount = Math.max(0, this.dotCount - 1);
    return true;
  }

  /** Player eats a blue bait pellet. */
  eatBait(col: number, row: number): boolean {
    if (!this.hasBait(col, row)) return false;
    this.tiles[row]![col] = "path";
    return true;
  }

  neighbor(pos: GridPos, direction: Direction): GridPos | null {
    if (direction === "none") return null;
    const v = DIRECTION_VECTORS[direction];
    const next = { col: pos.col + v.x, row: pos.row + v.y };
    if (!this.isWalkable(next.col, next.row)) return null;
    return next;
  }

  walkableDirections(pos: GridPos): Direction[] {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    return dirs.filter((d) => this.neighbor(pos, d) !== null);
  }

  /** Next rift destination for a pad the player is standing on. */
  pairedRift(from: GridPos): GridPos | null {
    const rifts = this.riftPositions;
    if (rifts.length < 2) return null;
    const idx = rifts.findIndex((p) => p.col === from.col && p.row === from.row);
    if (idx < 0) return null;
    return { ...rifts[(idx + 1) % rifts.length]! };
  }

  snapshotTiles(): readonly (readonly TileKind[])[] {
    return this.tiles;
  }
}
