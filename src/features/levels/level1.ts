import type { LevelDefinition } from "./LevelRegistry";
import { registerLevel } from "./LevelRegistry";

/**
 * Classic-inspired maze. Add more files under levels/ and register them
 * from `index.ts` to expand the campaign.
 */
export const level1: LevelDefinition = {
  id: "level-1",
  name: "Neon Alley",
  timeBonusLimitSeconds: 60,
  pointsPerDot: 10,
  maxTimeBonus: 1000,
  playerSpeed: 5.5,
  ghostSpeed: 3.2,
  ghostEatIntervalSeconds: 0.55,
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
    "#.......#G G#.......#",
    "#####.#.#####.#.#####",
    "#####.#.......#.#####",
    "#####.#.#####.#.#####",
    "#.........#.........#",
    "#.###.###.#.###.###.#",
    "#G..#.....P.....#..E#",
    "###.#.#.#####.#.#.###",
    "#.....#...#...#.....#",
    "#.#######.#.#######.#",
    "#...................#",
    "#####################",
  ],
};

registerLevel(level1);
