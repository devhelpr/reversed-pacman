import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { Direction, GridPos } from "../../core/types";

export class Player extends MovableEntity {
  readonly baseSpeed: number;
  animTimer = 0;
  animFrame = 0;
  /** Multiplier from slime / other floor effects. */
  speedMultiplier = 1;
  /** Seconds remaining of bait "hunted" status. */
  baitRemaining = 0;
  /** 0..1 progress while falling through a trap door. */
  fallProgress = 0;
  private falling = false;
  private fallDuration = 0.65;

  constructor(start: GridPos, speed: number) {
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

  /**
   * Returns whether the player just arrived on a new tile.
   * Also advances fall animation; when fall completes, alive becomes false.
   */
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

    const arrived = this.update(dt, maze);
    if (this.direction !== "none") {
      this.animTimer += dt;
      if (this.animTimer >= 0.12) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    }
    return arrived;
  }

  overlaps(other: MovableEntity, threshold = 0.55): boolean {
    if (!this.alive || !other.alive || this.falling) return false;
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
