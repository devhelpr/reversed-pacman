/** Shared primitive types used across core and features. */

export type Direction = "up" | "down" | "left" | "right" | "none";

export interface Vec2 {
  x: number;
  y: number;
}

export interface GridPos {
  col: number;
  row: number;
}

export type TileKind =
  | "wall"
  | "path"
  | "dot"
  | "exit"
  | "bait" // blue bait the player can eat
  | "trapdoor" // timed pit
  | "slime" // slows the player
  | "shock" // timed electric plate
  | "rift"; // paired teleporter

export type GamePhase = "ready" | "playing" | "won" | "lost" | "paused";

export type LoseReason = "dots" | "ghost" | "trapdoor" | "shock" | null;

export const DIRECTION_VECTORS: Record<Exclude<Direction, "none">, Vec2> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const OPPOSITE_DIRECTION: Record<Exclude<Direction, "none">, Exclude<Direction, "none">> = {
  up: "down",
  down: "up",
  left: "right",
  right: "left",
};

export function gridEquals(a: GridPos, b: GridPos): boolean {
  return a.col === b.col && a.row === b.row;
}
