import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { FloorPos } from "../../core/maze/LevelDefinition";
import type { Direction } from "../../core/types";

export class Player extends MovableEntity {
  readonly baseSpeed: number;
  animTimer = 0;
  animFrame = 0;
  speedMultiplier = 1;
  baitRemaining = 0;
  fallProgress = 0;
  private falling = false;
  private fallDuration = 0.65;
  private lastLiftKey: string | null = null;

  constructor(start: FloorPos, speed: number) {
    super(start, speed);
    this.baseSpeed = speed;
  }

  get isHunted(): boolean {
    return this.baitRemaining > 0;
  }

  get isFalling(): boolean {
    return this.falling;
  }

  activateBait(durationSeconds: number): void {
    this.baitRemaining = Math.max(this.baitRemaining, durationSeconds);
  }

  beginFall(durationSeconds: number): void {
    if (this.falling) return;
    this.falling = true;
    this.fallProgress = 0;
    this.fallDuration = Math.max(0.1, durationSeconds);
    this.direction = "none";
    this.nextDirection = "none";
    this.progress = 0;
  }

  handleInput(desired: Direction): void {
    if (this.falling) return;
    this.setDesiredDirection(desired);
  }

  tick(dt: number, maze: Maze): boolean {
    if (this.falling) {
      this.fallProgress = Math.min(1, this.fallProgress + dt / this.fallDuration);
      if (this.fallProgress >= 1) {
        this.alive = false;
      }
      return false;
    }

    this.speed = this.baseSpeed * this.speedMultiplier;
    if (this.baitRemaining > 0) {
      this.baitRemaining = Math.max(0, this.baitRemaining - dt);
    }

    const arrived = this.update(dt, (c, r) => maze.isWalkable(this.floor, c, r));
    if (this.direction !== "none") {
      this.animTimer += dt;
      if (this.animTimer >= 0.12) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    }
    return arrived;
  }

  /** Take a one-way lift if standing on one. Returns true when floor changed. */
  tryLift(maze: Maze, justArrived: boolean): boolean {
    if (!justArrived && this.lastLiftKey) {
      const tile = maze.getTile(this.floor, this.col, this.row);
      if (tile !== "liftUp" && tile !== "liftDown") {
        this.lastLiftKey = null;
      }
      return false;
    }
    if (!justArrived) return false;

    const key = `${this.floor}:${this.col},${this.row}`;
    if (this.lastLiftKey === key) return false;

    const dest = maze.liftDestination(this.floor, this.col, this.row);
    if (!dest) {
      this.lastLiftKey = null;
      return false;
    }

    this.floor = dest.floor;
    this.col = dest.col;
    this.row = dest.row;
    this.progress = 0;
    this.direction = "none";
    this.nextDirection = "none";
    this.lastLiftKey = `${this.floor}:${this.col},${this.row}`;
    return true;
  }

  overlaps(other: MovableEntity, threshold = 0.55): boolean {
    if (!this.alive || !other.alive || this.falling) return false;
    if (this.floor !== other.floor) return false;
    const a = this.getWorldPos();
    const b = other.getWorldPos();
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= threshold * threshold;
  }

  kill(): void {
    this.alive = false;
    this.falling = false;
    this.direction = "none";
    this.progress = 0;
  }
}
