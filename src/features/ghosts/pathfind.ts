import type { Maze } from "../../core/maze/Maze";
import type { Direction, GridPos } from "../../core/types";

const CARDINALS: Exclude<Direction, "none">[] = ["up", "down", "left", "right"];

/**
 * BFS from `start` and return the first step toward the best reachable goal.
 * Path length wins; `tieBreak` breaks ties so multiple humans fan out.
 */
export function directionTowardGoal(
  maze: Maze,
  floor: number,
  start: GridPos,
  isGoal: (col: number, row: number) => boolean,
  options: { dirRotate?: number; tieBreak?: (col: number, row: number) => number } = {},
): Direction | null {
  const w = maze.width;
  const h = maze.height;
  const size = w * h;
  const dist = new Int16Array(size).fill(-1);
  const firstStep = new Int8Array(size).fill(-1);

  const dirs = rotateDirs(options.dirRotate ?? 0);
  const dirIndex = (d: Direction): number => CARDINALS.indexOf(d as Exclude<Direction, "none">);

  const startKey = start.row * w + start.col;
  if (start.col < 0 || start.row < 0 || start.col >= w || start.row >= h) return null;

  dist[startKey] = 0;
  const queue = [startKey];

  for (let qi = 0; qi < queue.length; qi++) {
    const key = queue[qi]!;
    const col = key % w;
    const row = (key / w) | 0;
    const depth = dist[key]!;

    for (const dir of dirs) {
      const next = maze.neighbor(floor, { col, row }, dir);
      if (!next) continue;
      const nextKey = next.row * w + next.col;
      if (dist[nextKey]! >= 0) continue;
      dist[nextKey] = depth + 1;
      firstStep[nextKey] = depth === 0 ? dirIndex(dir) : firstStep[key]!;
      queue.push(nextKey);
    }
  }

  const tieBreak = options.tieBreak ?? (() => 0);
  let bestScore = Number.POSITIVE_INFINITY;
  let bestDirIdx = -1;

  for (let row = 0; row < h; row++) {
    for (let col = 0; col < w; col++) {
      if (!isGoal(col, row)) continue;
      const key = row * w + col;
      const d = dist[key]!;
      if (d <= 0) continue; // unreachable or already there
      const score = d * 10_000 + tieBreak(col, row);
      if (score < bestScore) {
        bestScore = score;
        bestDirIdx = firstStep[key]!;
      }
    }
  }

  if (bestDirIdx < 0) return null;
  return CARDINALS[bestDirIdx] ?? null;
}

function rotateDirs(offset: number): Exclude<Direction, "none">[] {
  const n = ((offset % CARDINALS.length) + CARDINALS.length) % CARDINALS.length;
  if (n === 0) return CARDINALS;
  return [...CARDINALS.slice(n), ...CARDINALS.slice(0, n)];
}
