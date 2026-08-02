import type { LevelDefinition } from "./LevelRegistry";
import { registerLevel } from "./LevelRegistry";

/**
 * Easier starter maze — fewer ghosts & traps, more breathing room.
 * Chars: # wall . dot o bait T trapdoor ~ slime Z shock @ rift P/G/E
 */
export const level1: LevelDefinition = {
  id: "level-1",
  name: "Neon Alley",
  timeBonusLimitSeconds: 90,
  pointsPerDot: 10,
  maxTimeBonus: 1000,
  playerSpeed: 5.8,
  ghostSpeed: 2.35,
  ghostEatIntervalSeconds: 1.15,
  baitDurationSeconds: 4,
  huntSpeedMultiplier: 1.15,
  trapdoorClosedMinSeconds: 8,
  trapdoorClosedMaxSeconds: 14,
  trapdoorOpenMinSeconds: 1.0,
  trapdoorOpenMaxSeconds: 1.8,
  trapdoorFallDurationSeconds: 0.65,
  shockCycleSeconds: 4.5,
  slimeSpeedFactor: 0.58,
  layout: [
    "#####################",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#G.................G#",
    "#.###.#.#####.#.###.#",
    "#.....#...#...#.....#",
    "#####.###.#.###.#####",
    "#####.#.......#.#####",
    "#####.#.## ##.#.#####",
    "#.......#G  #.......#",
    "#####.#.#####.#.#####",
    "#####.#.......#.#####",
    "#####.#.#####.#.#####",
    "#....o....#.........#",
    "#.###.###.#.###.###.#",
    "#...#.....P.....#..E#",
    "###.#.#.#####.#.#.###",
    "#..~..#...#...#..T..#",
    "#.#######.#.#######.#",
    "#....Z..............#",
    "#####################",
  ],
};

registerLevel(level1, { builtin: true });
