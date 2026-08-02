import type { Direction, GridPos, Vec2 } from "../types";
import { DIRECTION_VECTORS } from "../types";
import type { Maze } from "../maze/Maze";

/**
 * Grid-based entity that moves smoothly between tiles.
 */
export class MovableEntity {
  col: number;
  row: number;
  /** Fractional progress toward the next tile (0..1). */
  progress = 0;
  direction: Direction = "none";
  nextDirection: Direction = "none";
  speed: number;
  alive = true;

  constructor(start: GridPos, speed: number) {
    this.col = start.col;
    this.row = start.row;
    this.speed = speed;
  }

  get gridPos(): GridPos {
    return { col: this.col, row: this.row };
  }

  /** Pixel/world position in tile units (center of current/lerp tile). */
  getWorldPos(): Vec2 {
    if (this.direction === "none" || this.progress === 0) {
      return { x: this.col + 0.5, y: this.row + 0.5 };
    }
    const v = DIRECTION_VECTORS[this.direction];
    return {
      x: this.col + 0.5 + v.x * this.progress,
      y: this.row + 0.5 + v.y * this.progress,
    };
  }

  setDesiredDirection(direction: Direction): void {
    this.nextDirection = direction;
  }

  /**
   * Advance movement. `canEnter` gates tile entry (maze walkability).
   * Returns true when the entity just arrived on a new tile.
   */
  update(
    dt: number,
    maze: Maze,
    canEnter: (col: number, row: number) => boolean = (c, r) => maze.isWalkable(c, r),
  ): boolean {
    if (!this.alive) return false;

    let arrived = false;

    if (this.direction === "none") {
      this.tryStartMove(maze, canEnter);
      return false;
    }

    this.progress += this.speed * dt;

    while (this.progress >= 1) {
      const v = DIRECTION_VECTORS[this.direction];
      this.col += v.x;
      this.row += v.y;
      this.progress -= 1;
      arrived = true;

      // Prefer queued turn at intersections
      if (this.nextDirection !== "none" && this.nextDirection !== this.direction) {
        const nv = DIRECTION_VECTORS[this.nextDirection];
        const nc = this.col + nv.x;
        const nr = this.row + nv.y;
        if (canEnter(nc, nr)) {
          this.direction = this.nextDirection;
          continue;
        }
      }

      // Continue straight if possible
      const fv = DIRECTION_VECTORS[this.direction];
      if (!canEnter(this.col + fv.x, this.row + fv.y)) {
        this.direction = "none";
        this.progress = 0;
        this.tryStartMove(maze, canEnter);
        break;
      }
    }

    // Mid-tile reverse is allowed for player feel
    if (
      this.nextDirection !== "none" &&
      this.direction !== "none" &&
      this.isOpposite(this.nextDirection, this.direction)
    ) {
      const v = DIRECTION_VECTORS[this.direction];
      this.col += v.x;
      this.row += v.y;
      this.direction = this.nextDirection;
      this.progress = 1 - this.progress;
    }

    return arrived;
  }

  private tryStartMove(_maze: Maze, canEnter: (col: number, row: number) => boolean): void {
    const desired = this.nextDirection !== "none" ? this.nextDirection : this.direction;
    if (desired === "none") return;

    const v = DIRECTION_VECTORS[desired];
    if (canEnter(this.col + v.x, this.row + v.y)) {
      this.direction = desired;
      this.progress = 0;
    }
  }

  private isOpposite(a: Direction, b: Direction): boolean {
    if (a === "none" || b === "none") return false;
    const va = DIRECTION_VECTORS[a];
    const vb = DIRECTION_VECTORS[b];
    return va.x === -vb.x && va.y === -vb.y;
  }
}
