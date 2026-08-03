import type { GridPos, TileKind } from "../types";

/** Raw level layout characters used when authoring mazes. */
export type MazeChar =
  | "#" // wall
  | "." // path with scoreable dot
  | " " // empty path (no dot)
  | "P" // player spawn (path)
  | "G" // ghost spawn (path)
  | "E" // exit tile
  | "o" // blue bait (player can eat → hunt mode)
  | "T" // trap door
  | "~" // sticky slime
  | "Z" // shock plate
  | "@" // rift teleporter (paired in order on same floor)
  | "*" // bonus gem (player collects for score)
  | "^" // one-way lift up to the floor above (same cell)
  | "v"; // one-way lift down to the floor below (same cell)

export interface FloorDefinition {
  id: string;
  name: string;
  layout: string[];
}

export interface LevelDefinition {
  id: string;
  name: string;
  /**
   * First / only floor layout (back-compat).
   * When `floors` is set, this should match `floors[0].layout`.
   */
  layout: string[];
  /**
   * Optional multi-floor stack. Floor 0 is the bottom (or first) floor.
   * Omit / empty → single-floor using `layout`.
   */
  floors?: FloorDefinition[];
  /** Seconds under which a time bonus applies. */
  timeBonusLimitSeconds: number;
  /** Points per remaining dot at win. */
  pointsPerDot: number;
  /** Points awarded per bonus gem the player collects. */
  pointsPerBonus: number;
  /** Max time-bonus points when finishing instantly. */
  maxTimeBonus: number;
  /** Player tiles-per-second. */
  playerSpeed: number;
  /** Ghost tiles-per-second. */
  ghostSpeed: number;
  /** @deprecated Humans eat every dotted tile they enter; kept for level JSON compatibility. */
  ghostEatIntervalSeconds: number;
  /** How long bait makes ghosts hunt the player. */
  baitDurationSeconds: number;
  /** Ghost speed multiplier while hunting. */
  huntSpeedMultiplier: number;
  /** Minimum seconds a trap door stays closed before opening. */
  trapdoorClosedMinSeconds: number;
  /** Maximum seconds a trap door stays closed before opening. */
  trapdoorClosedMaxSeconds: number;
  /** Minimum seconds a trap door stays open. */
  trapdoorOpenMinSeconds: number;
  /** Maximum seconds a trap door stays open. */
  trapdoorOpenMaxSeconds: number;
  /** How long the player fall animation lasts. */
  trapdoorFallDurationSeconds: number;
  /** Off/on half-cycle for shock plates. */
  shockCycleSeconds: number;
  /** Player speed factor while on slime. */
  slimeSpeedFactor: number;
}

export interface FloorPos extends GridPos {
  floor: number;
}

export interface ParsedFloor {
  id: string;
  name: string;
  width: number;
  height: number;
  tiles: TileKind[][];
  ghostStarts: GridPos[];
  trapdoorPositions: GridPos[];
  shockPositions: GridPos[];
  riftPositions: GridPos[];
  liftUpPositions: GridPos[];
  liftDownPositions: GridPos[];
  initialDotCount: number;
}

export interface ParsedLevel {
  floors: ParsedFloor[];
  playerStart: FloorPos;
  exit: FloorPos;
  ghostStarts: FloorPos[];
  initialDotCount: number;
}

/** Resolve floor list with back-compat for single-layout levels. */
export function normalizeFloors(level: LevelDefinition): FloorDefinition[] {
  if (level.floors && level.floors.length > 0) {
    return level.floors.map((floor, i) => ({
      id: floor.id || `floor-${i}`,
      name: floor.name || `Floor ${i + 1}`,
      layout: [...floor.layout],
    }));
  }
  return [
    {
      id: "floor-0",
      name: "Floor 1",
      layout: [...level.layout],
    },
  ];
}

export function syncLayoutFromFloors(level: LevelDefinition): void {
  const floors = normalizeFloors(level);
  level.floors = floors;
  level.layout = [...floors[0]!.layout];
}

/**
 * Parse a single floor layout string grid.
 * Spawns (P/E/G) are optional here — validated across the whole level.
 */
export function parseFloorLayout(
  layout: string[],
  meta: { id: string; name: string },
): ParsedFloor {
  if (layout.length === 0) {
    throw new Error(`Floor "${meta.name}" must have at least one row`);
  }

  const height = layout.length;
  const width = layout[0]!.length;

  for (const row of layout) {
    if (row.length !== width) {
      throw new Error(`Floor "${meta.name}": all rows must have the same length`);
    }
  }

  const tiles: TileKind[][] = [];
  const ghostStarts: GridPos[] = [];
  const trapdoorPositions: GridPos[] = [];
  const shockPositions: GridPos[] = [];
  const riftPositions: GridPos[] = [];
  const liftUpPositions: GridPos[] = [];
  const liftDownPositions: GridPos[] = [];
  let initialDotCount = 0;

  for (let row = 0; row < height; row++) {
    const line = layout[row]!;
    tiles[row] = [];
    for (let col = 0; col < width; col++) {
      const ch = line[col] as MazeChar;
      switch (ch) {
        case "#":
          tiles[row]![col] = "wall";
          break;
        case ".":
          tiles[row]![col] = "dot";
          initialDotCount++;
          break;
        case " ":
          tiles[row]![col] = "path";
          break;
        case "P":
          tiles[row]![col] = "path";
          break;
        case "G":
          tiles[row]![col] = "path";
          ghostStarts.push({ col, row });
          break;
        case "E":
          tiles[row]![col] = "exit";
          break;
        case "o":
          tiles[row]![col] = "bait";
          break;
        case "T":
          tiles[row]![col] = "trapdoor";
          trapdoorPositions.push({ col, row });
          break;
        case "~":
          tiles[row]![col] = "slime";
          break;
        case "Z":
          tiles[row]![col] = "shock";
          shockPositions.push({ col, row });
          break;
        case "@":
          tiles[row]![col] = "rift";
          riftPositions.push({ col, row });
          break;
        case "*":
          tiles[row]![col] = "bonus";
          break;
        case "^":
          tiles[row]![col] = "liftUp";
          liftUpPositions.push({ col, row });
          break;
        case "v":
          tiles[row]![col] = "liftDown";
          liftDownPositions.push({ col, row });
          break;
        default: {
          const unknown: string = ch;
          throw new Error(`Floor "${meta.name}": unknown character "${unknown}" at ${col},${row}`);
        }
      }
    }
  }

  if (riftPositions.length === 1) {
    throw new Error(`Floor "${meta.name}": rifts (@) must come in pairs (or more)`);
  }

  return {
    id: meta.id,
    name: meta.name,
    width,
    height,
    tiles,
    ghostStarts,
    trapdoorPositions,
    shockPositions,
    riftPositions,
    liftUpPositions,
    liftDownPositions,
    initialDotCount,
  };
}

/** Full level parse + multi-floor lift validation. */
export function parseLevel(level: LevelDefinition): ParsedLevel {
  const floorDefs = normalizeFloors(level);
  const floors = floorDefs.map((f) => parseFloorLayout(f.layout, { id: f.id, name: f.name }));

  const width = floors[0]!.width;
  const height = floors[0]!.height;
  for (const floor of floors) {
    if (floor.width !== width || floor.height !== height) {
      throw new Error("All floors must share the same width and height");
    }
  }

  let playerStart: FloorPos | null = null;
  let exit: FloorPos | null = null;
  const ghostStarts: FloorPos[] = [];
  let initialDotCount = 0;

  for (let floorIndex = 0; floorIndex < floorDefs.length; floorIndex++) {
    const layout = floorDefs[floorIndex]!.layout;
    const parsed = floors[floorIndex]!;
    initialDotCount += parsed.initialDotCount;

    for (const g of parsed.ghostStarts) {
      ghostStarts.push({ floor: floorIndex, col: g.col, row: g.row });
    }

    for (let row = 0; row < height; row++) {
      for (let col = 0; col < width; col++) {
        const ch = layout[row]![col];
        if (ch === "P") {
          if (playerStart) throw new Error("Level needs exactly one player start (P)");
          playerStart = { floor: floorIndex, col, row };
        }
        if (ch === "E") {
          if (exit) throw new Error("Level needs exactly one exit (E)");
          exit = { floor: floorIndex, col, row };
        }
      }
    }

    for (const pos of parsed.liftUpPositions) {
      const destFloor = floorIndex + 1;
      if (destFloor >= floors.length) {
        throw new Error(
          `Lift up (^) on "${parsed.name}" at ${pos.col},${pos.row} has no floor above`,
        );
      }
      if (!isLiftLanding(floors[destFloor]!, pos.col, pos.row)) {
        throw new Error(`Lift up (^) on "${parsed.name}" at ${pos.col},${pos.row} lands in a wall`);
      }
    }

    for (const pos of parsed.liftDownPositions) {
      const destFloor = floorIndex - 1;
      if (destFloor < 0) {
        throw new Error(
          `Lift down (v) on "${parsed.name}" at ${pos.col},${pos.row} has no floor below`,
        );
      }
      if (!isLiftLanding(floors[destFloor]!, pos.col, pos.row)) {
        throw new Error(
          `Lift down (v) on "${parsed.name}" at ${pos.col},${pos.row} lands in a wall`,
        );
      }
    }
  }

  if (!playerStart) throw new Error("Maze needs a player start (P)");
  if (!exit) throw new Error("Maze needs an exit (E)");
  if (ghostStarts.length === 0) throw new Error("Maze needs at least one human (G)");

  return { floors, playerStart, exit, ghostStarts, initialDotCount };
}

function isLiftLanding(floor: ParsedFloor, col: number, row: number): boolean {
  const tile = floor.tiles[row]?.[col];
  return (
    tile === "path" ||
    tile === "dot" ||
    tile === "exit" ||
    tile === "bait" ||
    tile === "trapdoor" ||
    tile === "slime" ||
    tile === "shock" ||
    tile === "rift" ||
    tile === "bonus" ||
    tile === "liftUp" ||
    tile === "liftDown"
  );
}
