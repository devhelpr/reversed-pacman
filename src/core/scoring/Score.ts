import type { LevelDefinition } from "../maze/LevelDefinition";

export interface ScoreBreakdown {
  dotsRemaining: number;
  pointsPerDot: number;
  dotScore: number;
  elapsedSeconds: number;
  timeBonusLimitSeconds: number;
  timeBonus: number;
  total: number;
}

/**
 * Score = remaining dots × pointsPerDot + time bonus under the limit.
 * Time bonus scales linearly from maxTimeBonus at t=0 to 0 at the limit.
 */
export function computeScore(
  dotsRemaining: number,
  elapsedSeconds: number,
  level: LevelDefinition,
): ScoreBreakdown {
  const dotScore = dotsRemaining * level.pointsPerDot;

  let timeBonus = 0;
  if (elapsedSeconds <= level.timeBonusLimitSeconds) {
    const t = Math.max(0, 1 - elapsedSeconds / level.timeBonusLimitSeconds);
    timeBonus = Math.round(level.maxTimeBonus * t);
  }

  return {
    dotsRemaining,
    pointsPerDot: level.pointsPerDot,
    dotScore,
    elapsedSeconds,
    timeBonusLimitSeconds: level.timeBonusLimitSeconds,
    timeBonus,
    total: dotScore + timeBonus,
  };
}
