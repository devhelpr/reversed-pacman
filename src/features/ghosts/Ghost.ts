import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { FloorPos } from "../../core/maze/LevelDefinition";
import type { Direction, GridPos } from "../../core/types";
import { DIRECTION_VECTORS, OPPOSITE_DIRECTION } from "../../core/types";
import { manhattan } from "../traps/TrapSystem";

export type GhostMood = "forage" | "hunt";

/**
 * Human runner that forages for dots on its floor, or hunts the player when bait is active
 * and the player shares that floor.
 */
export class Ghost extends MovableEntity {
  readonly index: number;
  readonly baseSpeed: number;
  animTimer = 0;
  animFrame = 0;
  mood: GhostMood = "forage";

  constructor(start: FloorPos, speed: number, index: number, _eatIntervalSeconds: number) {
    super(start, speed);
    this.index = index;
    this.baseSpeed = speed;
  }

  tick(
    dt: number,
    maze: Maze,
    huntTarget: (GridPos & { floor: number }) | null,
    huntSpeedMultiplier: number,
  ): void {
    if (!this.alive) return;

    const huntingHere = huntTarget !== null && huntTarget.floor === this.floor;
    this.mood = huntingHere ? "hunt" : "forage";
    this.speed = this.baseSpeed * (this.mood === "hunt" ? huntSpeedMultiplier : 1);

    // Eat before moving so a dotted tile isn't skipped when leaving it.
    if (this.mood === "forage") {
      maze.eatDot(this.floor, this.col, this.row);
    }

    const target = huntingHere ? huntTarget : this.nearestDot(maze);

    if (this.direction === "none") {
      this.pickNewDirection(maze, target);
    }

    const arrived = this.update(dt, (c, r) => maze.isWalkable(this.floor, c, r));

    if (arrived || this.direction === "none") {
      this.pickNewDirection(maze, target);
    }

    if (arrived && this.mood === "forage") {
      maze.eatDot(this.floor, this.col, this.row);
    }

    this.animTimer += dt;
    if (this.animTimer >= 0.18) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }
  }

  catch(): void {
    this.alive = false;
    this.direction = "none";
    this.progress = 0;
    this.mood = "forage";
  }

  private nearestDot(maze: Maze): GridPos | null {
    const tiles = maze.snapshotTiles(this.floor);
    let best: GridPos | null = null;
    let bestScore = Number.POSITIVE_INFINITY;

    for (let row = 0; row < tiles.length; row++) {
      const line = tiles[row]!;
      for (let col = 0; col < line.length; col++) {
        if (line[col] !== "dot") continue;
        const dist = manhattan({ col, row }, this.gridPos);
        // Spread hunters so they don't all lock the same pellet.
        const jitter = ((col * 13 + row * 7 + this.index * 31) % 11) * 0.05;
        const score = dist + jitter;
        if (score < bestScore) {
          bestScore = score;
          best = { col, row };
        }
      }
    }

    return best;
  }

  private pickNewDirection(maze: Maze, seekTarget: GridPos | null): void {
    const options = maze.walkableDirections(this.floor, this.gridPos);
    if (options.length === 0) {
      this.direction = "none";
      return;
    }

    let choices = options;
    if (this.direction !== "none" && options.length > 1) {
      const opposite = OPPOSITE_DIRECTION[this.direction];
      choices = options.filter((d) => d !== opposite);
      if (choices.length === 0) choices = options;
    }

    if (seekTarget) {
      let best: Exclude<Direction, "none"> = choices[0] as Exclude<Direction, "none">;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const dir of choices) {
        if (dir === "none") continue;
        const v = DIRECTION_VECTORS[dir];
        const next = { col: this.col + v.x, row: this.row + v.y };
        const score = manhattan(next, seekTarget);
        const jitter = ((this.index * 17 + dir.charCodeAt(0)) % 5) * 0.01;
        if (score + jitter < bestScore) {
          bestScore = score + jitter;
          best = dir;
        }
      }
      this.direction = best;
      this.nextDirection = best;
      return;
    }

    const pick = choices[Math.floor(Math.random() * choices.length)] as Direction;
    this.direction = pick;
    this.nextDirection = pick;
  }
}
