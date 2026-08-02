import type { Direction, GridPos, TileKind } from "../types";
import { DIRECTION_VECTORS } from "../types";
import type { FloorPos, ParsedFloor, ParsedLevel } from "./LevelDefinition";

const WALKABLE: ReadonlySet<TileKind> = new Set([
  "path",
  "dot",
  "exit",
  "bait",
  "trapdoor",
  "slime",
  "shock",
  "rift",
  "bonus",
  "liftUp",
  "liftDown",
]);

interface FloorRuntime {
  readonly meta: ParsedFloor;
  tiles: TileKind[][];
  dotCount: number;
}

/**
 * Multi-floor mutable tile map. Dots / bait / bonuses are per-floor;
 * lifts move the player between floors at the same column/row.
 */
export class Maze {
  readonly width: number;
  readonly height: number;
  readonly floorCount: number;
  readonly playerStart: FloorPos;
  readonly ghostStarts: FloorPos[];
  readonly exit: FloorPos;
  readonly initialDotCount: number;
  readonly floorNames: string[];

  private readonly floors: FloorRuntime[];

  constructor(parsed: ParsedLevel) {
    this.width = parsed.floors[0]!.width;
    this.height = parsed.floors[0]!.height;
    this.floorCount = parsed.floors.length;
    this.playerStart = { ...parsed.playerStart };
    this.ghostStarts = parsed.ghostStarts.map((g) => ({ ...g }));
    this.exit = { ...parsed.exit };
    this.initialDotCount = parsed.initialDotCount;
    this.floorNames = parsed.floors.map((f) => f.name);
    this.floors = parsed.floors.map((floor) => ({
      meta: floor,
      tiles: floor.tiles.map((row) => [...row]),
      dotCount: floor.initialDotCount,
    }));
  }

  getFloorName(floor: number): string {
    return this.floorNames[floor] ?? `Floor ${floor + 1}`;
  }

  getDotsRemaining(): number {
    return this.floors.reduce((sum, f) => sum + f.dotCount, 0);
  }

  getTile(floor: number, col: number, row: number): TileKind {
    if (!this.inBounds(floor, col, row)) return "wall";
    return this.floors[floor]!.tiles[row]![col]!;
  }

  inBounds(floor: number, col: number, row: number): boolean {
    return (
      floor >= 0 &&
      floor < this.floorCount &&
      col >= 0 &&
      col < this.width &&
      row >= 0 &&
      row < this.height
    );
  }

  isWalkable(floor: number, col: number, row: number): boolean {
    return WALKABLE.has(this.getTile(floor, col, row));
  }

  hasDot(floor: number, col: number, row: number): boolean {
    return this.getTile(floor, col, row) === "dot";
  }

  hasBait(floor: number, col: number, row: number): boolean {
    return this.getTile(floor, col, row) === "bait";
  }

  hasBonus(floor: number, col: number, row: number): boolean {
    return this.getTile(floor, col, row) === "bonus";
  }

  eatDot(floor: number, col: number, row: number): boolean {
    if (!this.hasDot(floor, col, row)) return false;
    this.floors[floor]!.tiles[row]![col] = "path";
    this.floors[floor]!.dotCount = Math.max(0, this.floors[floor]!.dotCount - 1);
    return true;
  }

  eatBait(floor: number, col: number, row: number): boolean {
    if (!this.hasBait(floor, col, row)) return false;
    this.floors[floor]!.tiles[row]![col] = "path";
    return true;
  }

  eatBonus(floor: number, col: number, row: number): boolean {
    if (!this.hasBonus(floor, col, row)) return false;
    this.floors[floor]!.tiles[row]![col] = "path";
    return true;
  }

  neighbor(floor: number, pos: GridPos, direction: Direction): GridPos | null {
    if (direction === "none") return null;
    const v = DIRECTION_VECTORS[direction];
    const next = { col: pos.col + v.x, row: pos.row + v.y };
    if (!this.isWalkable(floor, next.col, next.row)) return null;
    return next;
  }

  walkableDirections(floor: number, pos: GridPos): Direction[] {
    const dirs: Direction[] = ["up", "down", "left", "right"];
    return dirs.filter((d) => this.neighbor(floor, pos, d) !== null);
  }

  pairedRift(floor: number, from: GridPos): GridPos | null {
    const rifts = this.floors[floor]?.meta.riftPositions ?? [];
    if (rifts.length < 2) return null;
    const idx = rifts.findIndex((p) => p.col === from.col && p.row === from.row);
    if (idx < 0) return null;
    return { ...rifts[(idx + 1) % rifts.length]! };
  }

  /** Resolve one-way lift destination, or null if not on a lift / blocked. */
  liftDestination(floor: number, col: number, row: number): FloorPos | null {
    const tile = this.getTile(floor, col, row);
    if (tile === "liftUp") {
      const dest = floor + 1;
      if (!this.isWalkable(dest, col, row)) return null;
      return { floor: dest, col, row };
    }
    if (tile === "liftDown") {
      const dest = floor - 1;
      if (!this.isWalkable(dest, col, row)) return null;
      return { floor: dest, col, row };
    }
    return null;
  }

  trapdoorPositions(floor: number): GridPos[] {
    return this.floors[floor]?.meta.trapdoorPositions.map((p) => ({ ...p })) ?? [];
  }

  allTrapdoorPositions(): FloorPos[] {
    const out: FloorPos[] = [];
    for (let f = 0; f < this.floorCount; f++) {
      for (const p of this.trapdoorPositions(f)) {
        out.push({ floor: f, ...p });
      }
    }
    return out;
  }

  snapshotTiles(floor: number): readonly (readonly TileKind[])[] {
    return this.floors[floor]?.tiles ?? [];
  }
}
