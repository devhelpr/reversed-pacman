import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { Direction, GridPos } from "../../core/types";
import { DIRECTION_VECTORS, OPPOSITE_DIRECTION } from "../../core/types";
import { manhattan } from "../traps/TrapSystem";

export type GhostMood = "forage" | "hunt";

/**
 * Ghost that forages for dots, or hunts the player after bait is eaten.
 */
export class Ghost extends MovableEntity {
  readonly index: number;
  readonly baseSpeed: number;
  animTimer = 0;
  animFrame = 0;
  mood: GhostMood = "forage";
  private eatCooldown: number;
  private readonly eatInterval: number;

  constructor(start: GridPos, speed: number, index: number, eatIntervalSeconds: number) {
    super(start, speed);
    this.index = index;
    this.baseSpeed = speed;
    this.eatInterval = eatIntervalSeconds;
    this.eatCooldown = eatIntervalSeconds * ((index % 4) / 4);
  }

  tick(dt: number, maze: Maze, huntTarget: GridPos | null, huntSpeedMultiplier: number): void {
    if (!this.alive) return;

    this.mood = huntTarget ? "hunt" : "forage";
    this.speed = this.baseSpeed * (this.mood === "hunt" ? huntSpeedMultiplier : 1);

    if (this.direction === "none") {
      this.pickNewDirection(maze, huntTarget);
    }

    const arrived = this.update(dt, maze);

    if (arrived || this.direction === "none") {
      this.pickNewDirection(maze, huntTarget);
    }

    this.animTimer += dt;
    if (this.animTimer >= 0.18) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    if (this.mood === "forage") {
      this.eatCooldown -= dt;
      if (this.eatCooldown <= 0 && maze.hasDot(this.col, this.row)) {
        maze.eatDot(this.col, this.row);
        this.eatCooldown = this.eatInterval;
      }
    }
  }

  catch(): void {
    this.alive = false;
    this.direction = "none";
    this.progress = 0;
    this.mood = "forage";
  }

  private pickNewDirection(maze: Maze, huntTarget: GridPos | null): void {
    const options = maze.walkableDirections(this.gridPos);
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

    if (huntTarget) {
      let best: Exclude<Direction, "none"> = choices[0] as Exclude<Direction, "none">;
      let bestScore = Number.POSITIVE_INFINITY;
      for (const dir of choices) {
        if (dir === "none") continue;
        const v = DIRECTION_VECTORS[dir];
        const next = { col: this.col + v.x, row: this.row + v.y };
        const score = manhattan(next, huntTarget);
        // Slight jitter so ghosts don't always stack identically
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

    const withDots = choices.filter((d) => {
      const n = maze.neighbor(this.gridPos, d);
      return n !== null && maze.hasDot(n.col, n.row);
    });

    const pool = withDots.length > 0 ? withDots : choices;
    const pick = pool[Math.floor(Math.random() * pool.length)] as Direction;
    this.direction = pick;
    this.nextDirection = pick;
  }
}
