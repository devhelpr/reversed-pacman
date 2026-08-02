import { MovableEntity } from "../../core/entities/MovableEntity";
import type { Maze } from "../../core/maze/Maze";
import type { Direction, GridPos } from "../../core/types";
import { OPPOSITE_DIRECTION } from "../../core/types";

/**
 * Ghost that wanders the maze and eats dots on a timer.
 * AI is intentionally simple and swappable later.
 */
export class Ghost extends MovableEntity {
  readonly index: number;
  animTimer = 0;
  animFrame = 0;
  private eatCooldown: number;
  private readonly eatInterval: number;

  constructor(start: GridPos, speed: number, index: number, eatIntervalSeconds: number) {
    super(start, speed);
    this.index = index;
    this.eatInterval = eatIntervalSeconds;
    // Stagger so ghosts don't all eat on the same beat
    this.eatCooldown = eatIntervalSeconds * ((index % 4) / 4);
  }

  tick(dt: number, maze: Maze): void {
    if (!this.alive) return;

    if (this.direction === "none") {
      this.pickNewDirection(maze);
    }

    const arrived = this.update(dt, maze);

    if (arrived || this.direction === "none") {
      this.pickNewDirection(maze);
    }

    this.animTimer += dt;
    if (this.animTimer >= 0.18) {
      this.animTimer = 0;
      this.animFrame = (this.animFrame + 1) % 2;
    }

    this.eatCooldown -= dt;
    if (this.eatCooldown <= 0 && maze.hasDot(this.col, this.row)) {
      maze.eatDot(this.col, this.row);
      this.eatCooldown = this.eatInterval;
    }
  }

  catch(): void {
    this.alive = false;
    this.direction = "none";
    this.progress = 0;
  }

  private pickNewDirection(maze: Maze): void {
    const options = maze.walkableDirections(this.gridPos);
    if (options.length === 0) {
      this.direction = "none";
      return;
    }

    // Prefer not reversing unless it's the only option
    let choices = options;
    if (this.direction !== "none" && options.length > 1) {
      const opposite = OPPOSITE_DIRECTION[this.direction];
      choices = options.filter((d) => d !== opposite);
      if (choices.length === 0) choices = options;
    }

    // Bias toward tiles that still have dots
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
