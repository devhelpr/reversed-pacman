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
  | "@"; // rift teleporter (paired in order)

export interface LevelDefinition {
  id: string;
  name: string;
  /** Rows of equal-length maze strings. */
  layout: string[];
  /** Seconds under which a time bonus applies. */
  timeBonusLimitSeconds: number;
  /** Points per remaining dot at win. */
  pointsPerDot: number;
  /** Max time-bonus points when finishing instantly. */
  maxTimeBonus: number;
  /** Player tiles-per-second. */
  playerSpeed: number;
  /** Ghost tiles-per-second. */
  ghostSpeed: number;
  /** How often (seconds) a ghost eats a dot while standing on one. */
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

export interface ParsedMaze {
  width: number;
  height: number;
  tiles: TileKind[][];
  playerStart: GridPos;
  ghostStarts: GridPos[];
  exit: GridPos;
  initialDotCount: number;
  baitPositions: GridPos[];
  trapdoorPositions: GridPos[];
  slimePositions: GridPos[];
  shockPositions: GridPos[];
  riftPositions: GridPos[];
}

export function parseMaze(layout: string[]): ParsedMaze {
  if (layout.length === 0) {
    throw new Error("Maze layout must have at least one row");
  }

  const height = layout.length;
  const width = layout[0]!.length;

  for (const row of layout) {
    if (row.length !== width) {
      throw new Error("All maze rows must have the same length");
    }
  }

  const tiles: TileKind[][] = [];
  let playerStart: GridPos | null = null;
  const ghostStarts: GridPos[] = [];
  let exit: GridPos | null = null;
  let initialDotCount = 0;
  const baitPositions: GridPos[] = [];
  const trapdoorPositions: GridPos[] = [];
  const slimePositions: GridPos[] = [];
  const shockPositions: GridPos[] = [];
  const riftPositions: GridPos[] = [];

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
          playerStart = { col, row };
          break;
        case "G":
          tiles[row]![col] = "path";
          ghostStarts.push({ col, row });
          break;
        case "E":
          tiles[row]![col] = "exit";
          exit = { col, row };
          break;
        case "o":
          tiles[row]![col] = "bait";
          baitPositions.push({ col, row });
          break;
        case "T":
          tiles[row]![col] = "trapdoor";
          trapdoorPositions.push({ col, row });
          break;
        case "~":
          tiles[row]![col] = "slime";
          slimePositions.push({ col, row });
          break;
        case "Z":
          tiles[row]![col] = "shock";
          shockPositions.push({ col, row });
          break;
        case "@":
          tiles[row]![col] = "rift";
          riftPositions.push({ col, row });
          break;
        default: {
          const unknown: string = ch;
          throw new Error(`Unknown maze character "${unknown}" at ${col},${row}`);
        }
      }
    }
  }

  if (!playerStart) throw new Error("Maze needs a player start (P)");
  if (!exit) throw new Error("Maze needs an exit (E)");
  if (ghostStarts.length === 0) throw new Error("Maze needs at least one ghost (G)");
  if (riftPositions.length === 1) {
    throw new Error("Rifts (@) must come in pairs (or more)");
  }

  return {
    width,
    height,
    tiles,
    playerStart,
    ghostStarts,
    exit,
    initialDotCount,
    baitPositions,
    trapdoorPositions,
    slimePositions,
    shockPositions,
    riftPositions,
  };
}
