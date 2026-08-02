import type { LevelDefinition } from "../maze/LevelDefinition";

export interface ScoreBreakdown {
  dotsRemaining: number;
  pointsPerDot: number;
  dotScore: number;
  bonusCollected: number;
  pointsPerBonus: number;
  bonusScore: number;
  elapsedSeconds: number;
  timeBonusLimitSeconds: number;
  timeBonus: number;
  total: number;
}

/**
 * Score = remaining dots × pointsPerDot
 *       + collected bonus gems × pointsPerBonus
 *       + time bonus under the limit.
 */
export function computeScore(
  dotsRemaining: number,
  elapsedSeconds: number,
  level: LevelDefinition,
  bonusCollected = 0,
): ScoreBreakdown {
  const dotScore = dotsRemaining * level.pointsPerDot;
  const bonusScore = bonusCollected * level.pointsPerBonus;

  let timeBonus = 0;
  if (elapsedSeconds <= level.timeBonusLimitSeconds) {
    const t = Math.max(0, 1 - elapsedSeconds / level.timeBonusLimitSeconds);
    timeBonus = Math.round(level.maxTimeBonus * t);
  }

  return {
    dotsRemaining,
    pointsPerDot: level.pointsPerDot,
    dotScore,
    bonusCollected,
    pointsPerBonus: level.pointsPerBonus,
    bonusScore,
    elapsedSeconds,
    timeBonusLimitSeconds: level.timeBonusLimitSeconds,
    timeBonus,
    total: dotScore + bonusScore + timeBonus,
  };
}
