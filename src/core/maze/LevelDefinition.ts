import type { GridPos, TileKind } from "../types";

/** Raw level layout characters used when authoring mazes. */
export type MazeChar =
  | "#" // wall
  | "." // path with dot
  | " " // empty path (no dot)
  | "P" // player spawn (path)
  | "G" // ghost spawn (path)
  | "E"; // exit tile

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
}

export interface ParsedMaze {
  width: number;
  height: number;
  tiles: TileKind[][];
  playerStart: GridPos;
  ghostStarts: GridPos[];
  exit: GridPos;
  initialDotCount: number;
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

  return {
    width,
    height,
    tiles,
    playerStart,
    ghostStarts,
    exit,
    initialDotCount,
  };
}
