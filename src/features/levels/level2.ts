import type { LevelDefinition } from "./LevelRegistry";
import { registerLevel } from "./LevelRegistry";

/**
 * Two-floor industrial stack — rooms and shafts, not Pac-Man corridors.
 * Chars: # . [space] P G E o T ~ Z @ * ^ v
 */
export const level2: LevelDefinition = {
  id: "level-2",
  name: "Split Stack",
  timeBonusLimitSeconds: 120,
  pointsPerDot: 10,
  pointsPerBonus: 50,
  maxTimeBonus: 1500,
  playerSpeed: 5.8,
  ghostSpeed: 2.4,
  ghostEatIntervalSeconds: 1.1,
  baitDurationSeconds: 4,
  huntSpeedMultiplier: 1.18,
  trapdoorClosedMinSeconds: 7,
  trapdoorClosedMaxSeconds: 13,
  trapdoorOpenMinSeconds: 1.0,
  trapdoorOpenMaxSeconds: 1.6,
  trapdoorFallDurationSeconds: 0.65,
  shockCycleSeconds: 4.2,
  slimeSpeedFactor: 0.55,
  layout: [],
  floors: [
    {
      id: "cellar",
      name: "Cellar",
      layout: [
        "#####################",
        "###.........##....###",
        "###.####....##.##.###",
        "#G..#....^.....#...G#",
        "#...##..#####..##...#",
        "#......#.....#......#",
        "##.###.#..#..#.######",
        "##.#..........#.....#",
        "##.#.#########.####.#",
        "#....#..G....#......#",
        "#.####..###..####.#.#",
        "#.................#.#",
        "###.##.......######.#",
        "#..o.........*......#",
        "#.####.#####.###.##.#",
        "#....#...P.......#..#",
        "##.#.#.#######.#.#.##",
        "#..~.#...###...#.T..#",
        "#.#####.......#####.#",
        "#....Z.##...##.*....#",
        "#####################",
      ],
    },
    {
      id: "attic",
      name: "Attic",
      layout: [
        "#####################",
        "#.....###.......#..G#",
        "#.###.#...#####.#.###",
        "#.#...#.......v.....#",
        "#.#.#####.#.#####.#.#",
        "#G........#.......#.#",
        "#######.#.#.#.#######",
        "#.....#.#...#.#.....#",
        "#.###.#.#####.#.###.#",
        "#.#.............#...#",
        "#.#.###########.#.###",
        "#...................#",
        "###.###.......#####.#",
        "#..*............o...#",
        "#.#####.#####.#####.#",
        "#.....#.........#..E#",
        "##.##.#.#####.#.#.###",
        "#..T..#...#...#..~..#",
        "#.#######...#######.#",
        "#....*....#....Z....#",
        "#####################",
      ],
    },
  ],
};

// Keep top-level layout in sync with floor 0 for back-compat consumers.
level2.layout = [...level2.floors![0]!.layout];

registerLevel(level2, { builtin: true });
