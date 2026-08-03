import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { FloorPos } from "../../core/maze/LevelDefinition";
import type { Direction, GridPos } from "../../core/types";
import { directionTowardGoal } from "./pathfind";

export type GhostMood = "forage" | "hunt" | "patrol";

const STUCK_LOOP_UNIQUE = 4;
const STUCK_IDLE_SECONDS = 1.25;
const PATROL_RETARGET_SECONDS = 6;

/**
 * Human runner that forages for dots, hunts on bait, or patrols far waypoints
 * when their floor is cleared. Stuck humans warp to a distant tile.
 */
export class Ghost extends MovableEntity {
  readonly index: number;
  readonly baseSpeed: number;
  animTimer = 0;
  animFrame = 0;
  mood: GhostMood = "forage";
  private readonly recent = new Array<number>();
  private readonly recentCap = 12;
  private idleTime = 0;
  private patrolTarget: GridPos | null = null;
  private patrolAge = 0;

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
    const floorHasDots = this.floorHasDots(maze);

    if (huntingHere) {
      this.mood = "hunt";
      this.speed = this.baseSpeed * huntSpeedMultiplier;
      this.patrolTarget = null;
    } else if (floorHasDots) {
      this.mood = "forage";
      this.speed = this.baseSpeed;
    } else {
      // Floor cleared — roam distant waypoints until the match ends (all dots = lose).
      this.mood = "patrol";
      this.speed = this.baseSpeed * 1.05;
    }

    if (this.mood === "forage") {
      maze.eatDot(this.floor, this.col, this.row);
    }

    if (this.mood === "patrol") {
      this.patrolAge += dt;
      this.ensurePatrolTarget(maze);
    }

    if (this.direction === "none") {
      this.chooseDirection(maze, huntingHere ? huntTarget : null);
    }

    const arrived = this.update(dt, (c, r) => maze.isWalkable(this.floor, c, r));

    if (arrived) {
      this.idleTime = 0;
      this.rememberTile(maze);
      if (this.mood === "forage") {
        maze.eatDot(this.floor, this.col, this.row);
      }
      if (this.mood === "patrol" && this.patrolTarget) {
        if (this.col === this.patrolTarget.col && this.row === this.patrolTarget.row) {
          this.patrolTarget = null;
          this.patrolAge = 0;
        }
      }
      if (this.isLooping()) {
        this.teleportFar(maze);
      } else {
        this.chooseDirection(maze, huntingHere ? huntTarget : null);
      }
    } else if (this.direction === "none") {
      this.idleTime += dt;
      if (this.idleTime >= STUCK_IDLE_SECONDS) {
        this.teleportFar(maze);
      } else {
        this.chooseDirection(maze, huntingHere ? huntTarget : null);
      }
    } else {
      this.idleTime = 0;
    }

    if (this.mood === "patrol" && this.patrolAge >= PATROL_RETARGET_SECONDS) {
      this.patrolTarget = null;
      this.patrolAge = 0;
      this.ensurePatrolTarget(maze);
      this.chooseDirection(maze, null);
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
    this.recent.length = 0;
    this.idleTime = 0;
    this.patrolTarget = null;
    this.patrolAge = 0;
  }

  private floorHasDots(maze: Maze): boolean {
    const tiles = maze.snapshotTiles(this.floor);
    for (const row of tiles) {
      for (const tile of row) {
        if (tile === "dot") return true;
      }
    }
    return false;
  }

  private chooseDirection(maze: Maze, huntTarget: (GridPos & { floor: number }) | null): void {
    const options = maze.walkableDirections(this.floor, this.gridPos);
    if (options.length === 0) {
      this.direction = "none";
      this.nextDirection = "none";
      return;
    }

    let next: Direction | null = null;

    if (huntTarget) {
      next = directionTowardGoal(
        maze,
        this.floor,
        this.gridPos,
        (col, row) => col === huntTarget.col && row === huntTarget.row,
        { dirRotate: this.index },
      );
    } else if (this.mood === "forage") {
      next = directionTowardGoal(
        maze,
        this.floor,
        this.gridPos,
        (col, row) => maze.hasDot(this.floor, col, row),
        {
          dirRotate: this.index,
          tieBreak: (col, row) => {
            const recentPenalty = this.wasRecent(maze, col, row) ? 500 : 0;
            const spread = (col * 17 + row * 29 + this.index * 47) % 97;
            return recentPenalty + spread;
          },
        },
      );
    } else if (this.patrolTarget) {
      const target = this.patrolTarget;
      next = directionTowardGoal(
        maze,
        this.floor,
        this.gridPos,
        (col, row) => col === target.col && row === target.row,
        { dirRotate: this.index },
      );
    }

    if (next === null || next === "none") {
      next = this.exploreAwayFromRecent(maze, options);
    }

    this.direction = next;
    this.nextDirection = next;
  }

  private ensurePatrolTarget(maze: Maze): void {
    if (this.patrolTarget) {
      if (!maze.isWalkable(this.floor, this.patrolTarget.col, this.patrolTarget.row)) {
        this.patrolTarget = null;
      } else {
        return;
      }
    }
    this.patrolTarget = this.pickFarTile(maze);
  }

  private isLooping(): boolean {
    if (this.recent.length < this.recentCap) return false;
    return new Set(this.recent).size <= STUCK_LOOP_UNIQUE;
  }

  /** Warp to a random walkable tile far from the current spot. */
  private teleportFar(maze: Maze): void {
    const dest = this.pickFarTile(maze);
    if (!dest) return;

    this.col = dest.col;
    this.row = dest.row;
    this.progress = 0;
    this.direction = "none";
    this.nextDirection = "none";
    this.recent.length = 0;
    this.idleTime = 0;
    this.patrolTarget = null;
    this.patrolAge = 0;
  }

  private pickFarTile(maze: Maze): GridPos | null {
    const minDist = Math.max(6, Math.floor(Math.min(maze.width, maze.height) * 0.35));
    const far: GridPos[] = [];
    const any: GridPos[] = [];

    for (let row = 0; row < maze.height; row++) {
      for (let col = 0; col < maze.width; col++) {
        if (!maze.isWalkable(this.floor, col, row)) continue;
        if (col === this.col && row === this.row) continue;
        const pos = { col, row };
        any.push(pos);
        if (manhattan(pos, this.gridPos) >= minDist) far.push(pos);
      }
    }

    const pool = far.length > 0 ? far : any;
    if (pool.length === 0) return null;
    return pool[Math.floor(Math.random() * pool.length)] ?? null;
  }

  private exploreAwayFromRecent(maze: Maze, options: Direction[]): Direction {
    let best: Direction = options[0]!;
    let bestScore = Number.POSITIVE_INFINITY;

    for (const dir of options) {
      if (dir === "none") continue;
      const n = maze.neighbor(this.floor, this.gridPos, dir);
      if (!n) continue;
      const recent = this.wasRecent(maze, n.col, n.row) ? 1 : 0;
      const reverse =
        this.direction !== "none" && this.direction !== dir && isOpposite(this.direction, dir)
          ? 1
          : 0;
      const jitter = (dir.charCodeAt(0) + this.index * 3) % 5;
      const score = recent * 100 + reverse * 10 + jitter;
      if (score < bestScore) {
        bestScore = score;
        best = dir;
      }
    }

    return best;
  }

  private rememberTile(maze: Maze): void {
    const key = this.row * maze.width + this.col;
    this.recent.push(key);
    if (this.recent.length > this.recentCap) this.recent.shift();
  }

  private wasRecent(maze: Maze, col: number, row: number): boolean {
    const key = row * maze.width + col;
    return this.recent.includes(key);
  }
}

function manhattan(a: GridPos, b: GridPos): number {
  return Math.abs(a.col - b.col) + Math.abs(a.row - b.row);
}

function isOpposite(a: Direction, b: Direction): boolean {
  return (
    (a === "up" && b === "down") ||
    (a === "down" && b === "up") ||
    (a === "left" && b === "right") ||
    (a === "right" && b === "left")
  );
}
