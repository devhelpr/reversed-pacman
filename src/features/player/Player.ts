import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { Direction, GridPos } from "../../core/types";

export class Player extends MovableEntity {
  animTimer = 0;
  animFrame = 0;

  constructor(start: GridPos, speed: number) {
    super(start, speed);
  }

  handleInput(desired: Direction): void {
    this.setDesiredDirection(desired);
  }

  tick(dt: number, maze: Maze): void {
    this.update(dt, maze);
    if (this.direction !== "none") {
      this.animTimer += dt;
      if (this.animTimer >= 0.12) {
        this.animTimer = 0;
        this.animFrame = (this.animFrame + 1) % 2;
      }
    }
  }

  overlaps(other: MovableEntity, threshold = 0.55): boolean {
    if (!this.alive || !other.alive) return false;
    const a = this.getWorldPos();
    const b = other.getWorldPos();
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy <= threshold * threshold;
  }
}
