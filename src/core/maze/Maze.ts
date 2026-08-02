import type { Direction, GridPos, TileKind } from "../types";
import { DIRECTION_VECTORS } from "../types";
import type { ParsedMaze } from "./LevelDefinition";

/**
 * Mutable tile map for a loaded maze. Ghosts remove dots at runtime.
 */
export class Maze {
  readonly width: number;
  readonly height: number;
  readonly playerStart: GridPos;
  readonly ghostStarts: GridPos[];
  readonly exit: GridPos;
  readonly initialDotCount: number;

  private tiles: TileKind[][];
  private dotCount: number;

  constructor(parsed: ParsedMaze) {
    this.width = parsed.width;
    this.height = parsed.height;
    this.playerStart = { ...parsed.playerStart };
    this.ghostStarts = parsed.ghostStarts.map((g) => ({ ...g }));
    this.exit = { ...parsed.exit };
    this.initialDotCount = parsed.initialDotCount;
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
    const tile = this.getTile(col, row);
    return tile === "path" || tile === "dot" || tile === "exit";
  }

  hasDot(col: number, row: number): boolean {
    return this.getTile(col, row) === "dot";
  }

  /** Remove a dot if present. Returns true when a dot was eaten. */
  eatDot(col: number, row: number): boolean {
    if (!this.hasDot(col, row)) return false;
    this.tiles[row]![col] = "path";
    this.dotCount = Math.max(0, this.dotCount - 1);
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

  /** Clone tiles for rendering without mutation. */
  snapshotTiles(): readonly (readonly TileKind[])[] {
    return this.tiles;
  }
}
