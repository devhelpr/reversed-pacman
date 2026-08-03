const STORAGE_KEY = "maze-chase-high-scores";
const NAME_KEY = "maze-chase-player-name";
export const MAX_HIGH_SCORES_PER_LEVEL = 3;

export interface HighScoreEntry {
  levelId: string;
  levelName: string;
  score: number;
  playerName: string;
}

/** All levels keyed by id, each list sorted highest-first (max 3). */
export type HighScoreBoard = Record<string, HighScoreEntry[]>;

function readBoard(): HighScoreBoard {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const board: HighScoreBoard = {};
    for (const [levelId, rows] of Object.entries(parsed as Record<string, unknown>)) {
      if (!Array.isArray(rows)) continue;
      board[levelId] = rows
        .filter(isEntry)
        .map((row) => ({
          levelId: String(row.levelId || levelId),
          levelName: String(row.levelName || levelId),
          score: Math.max(0, Math.floor(Number(row.score) || 0)),
          playerName: sanitizeName(String(row.playerName || "Player")),
        }))
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_HIGH_SCORES_PER_LEVEL);
    }
    return board;
  } catch {
    return {};
  }
}

function writeBoard(board: HighScoreBoard): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(board));
  } catch {
    // Quota / private mode — ignore; scores stay session-local.
  }
}

function isEntry(value: unknown): value is HighScoreEntry {
  if (!value || typeof value !== "object") return false;
  const row = value as Partial<HighScoreEntry>;
  return typeof row.score === "number" || typeof row.score === "string";
}

export function sanitizeName(name: string): string {
  const trimmed = name.trim().slice(0, 12);
  return trimmed || "Player";
}

export function getLastPlayerName(): string {
  try {
    return sanitizeName(localStorage.getItem(NAME_KEY) || "Player");
  } catch {
    return "Player";
  }
}

export function setLastPlayerName(name: string): void {
  try {
    localStorage.setItem(NAME_KEY, sanitizeName(name));
  } catch {
    // ignore
  }
}

export function getHighScores(levelId: string): HighScoreEntry[] {
  return [...(readBoard()[levelId] ?? [])];
}

export function getHighScoreBoard(): HighScoreBoard {
  return readBoard();
}

/**
 * 1-based rank if this score would enter the top 3, otherwise null.
 * Ties: a new equal score still qualifies (pushes older equal off when full).
 */
export function rankForScore(levelId: string, score: number): number | null {
  if (score <= 0) return null;
  const list = getHighScores(levelId);
  if (list.length < MAX_HIGH_SCORES_PER_LEVEL) {
    const better = list.filter((e) => e.score > score).length;
    return better + 1;
  }
  const lowest = list[list.length - 1]!.score;
  if (score <= lowest) return null;
  const better = list.filter((e) => e.score > score).length;
  return better + 1;
}

export function submitHighScore(input: {
  levelId: string;
  levelName: string;
  score: number;
  playerName: string;
}): { rank: number; entries: HighScoreEntry[] } | null {
  const rank = rankForScore(input.levelId, input.score);
  if (rank == null) return null;

  const name = sanitizeName(input.playerName);
  setLastPlayerName(name);

  const board = readBoard();
  const next: HighScoreEntry[] = [
    ...(board[input.levelId] ?? []),
    {
      levelId: input.levelId,
      levelName: input.levelName,
      score: Math.max(0, Math.floor(input.score)),
      playerName: name,
    },
  ]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_HIGH_SCORES_PER_LEVEL);

  // Keep stored level name fresh for display
  for (const entry of next) {
    entry.levelName = input.levelName;
  }

  board[input.levelId] = next;
  writeBoard(board);
  return { rank, entries: next };
}
