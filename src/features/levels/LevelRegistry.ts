import type { LevelDefinition } from "../../core/maze/LevelDefinition";

const registry = new Map<string, LevelDefinition>();
const builtinIds = new Set<string>();

export function registerLevel(level: LevelDefinition, options?: { builtin?: boolean }): void {
  if (registry.has(level.id) && options?.builtin !== true && builtinIds.has(level.id)) {
    throw new Error(`Cannot overwrite built-in level "${level.id}"`);
  }
  if (options?.builtin) builtinIds.add(level.id);
  registry.set(level.id, level);
}

/** Insert or replace a custom level in the runtime registry. */
export function upsertLevel(level: LevelDefinition): void {
  if (builtinIds.has(level.id)) {
    throw new Error(`Cannot overwrite built-in level "${level.id}"`);
  }
  registry.set(level.id, level);
}

export function unregisterLevel(id: string): void {
  if (builtinIds.has(id)) {
    throw new Error(`Cannot remove built-in level "${id}"`);
  }
  registry.delete(id);
}

export function isBuiltinLevel(id: string): boolean {
  return builtinIds.has(id);
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

export { type LevelDefinition, parseMaze } from "../../core/maze/LevelDefinition";
export type { ParsedMaze } from "../../core/maze/LevelDefinition";
