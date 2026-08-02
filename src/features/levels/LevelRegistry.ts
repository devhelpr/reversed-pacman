export { type LevelDefinition, parseMaze } from "../../core/maze/LevelDefinition";
export type { ParsedMaze } from "../../core/maze/LevelDefinition";

import type { LevelDefinition } from "../../core/maze/LevelDefinition";

const registry = new Map<string, LevelDefinition>();

export function registerLevel(level: LevelDefinition): void {
  if (registry.has(level.id)) {
    throw new Error(`Level "${level.id}" is already registered`);
  }
  registry.set(level.id, level);
}

export function getLevel(id: string): LevelDefinition {
  const level = registry.get(id);
  if (!level) throw new Error(`Unknown level "${id}"`);
  return level;
}

export function listLevels(): LevelDefinition[] {
  return [...registry.values()];
}

export function getFirstLevel(): LevelDefinition {
  const first = registry.values().next().value;
  if (!first) throw new Error("No levels registered");
  return first;
}
