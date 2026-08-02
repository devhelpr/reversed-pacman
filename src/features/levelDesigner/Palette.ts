import type { MazeChar } from "../../core/maze/LevelDefinition";

export interface PaletteBrush {
  char: MazeChar;
  label: string;
  color: string;
  hint: string;
}

export const PALETTE: PaletteBrush[] = [
  { char: "#", label: "Wall", color: "#2E5BFF", hint: "Solid wall" },
  { char: ".", label: "Dot", color: "#F5E6A3", hint: "Scoreable path" },
  { char: " ", label: "Empty", color: "#1A1A2E", hint: "Path, no dot" },
  { char: "P", label: "Player", color: "#FFE14A", hint: "One spawn" },
  { char: "G", label: "Ghost", color: "#FF4B5C", hint: "Ghost spawn" },
  { char: "E", label: "Exit", color: "#5CFF8A", hint: "One exit" },
  { char: "o", label: "Bait", color: "#4B7BFF", hint: "Blue bait" },
  { char: "T", label: "Trap", color: "#E8C060", hint: "Trap door" },
  { char: "~", label: "Slime", color: "#3DCF5A", hint: "Slow floor" },
  { char: "Z", label: "Shock", color: "#FFE14A", hint: "Shock plate" },
  { char: "@", label: "Rift", color: "#B14BFF", hint: "Teleport (pairs)" },
];

export function brushColor(ch: MazeChar): string {
  return PALETTE.find((b) => b.char === ch)?.color ?? "#888";
}
