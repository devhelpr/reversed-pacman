import type { MazeChar } from "../../core/maze/LevelDefinition";

export interface PaletteBrush {
  char: MazeChar;
  label: string;
  color: string;
  hint: string;
}

export const PALETTE: PaletteBrush[] = [
  { char: "#", label: "Wall", color: "#8AB0D0", hint: "Metal pipe wall" },
  { char: ".", label: "Dot", color: "#F0D878", hint: "Scoreable path" },
  { char: " ", label: "Empty", color: "#1A1512", hint: "Path, no dot" },
  { char: "P", label: "Robot", color: "#C8D0D8", hint: "One spawn" },
  { char: "G", label: "Human", color: "#E24A4A", hint: "Human spawn" },
  { char: "E", label: "Exit", color: "#3DFFB5", hint: "One exit" },
  { char: "o", label: "Bait", color: "#4B8CFF", hint: "Blue bait" },
  { char: "*", label: "Bonus", color: "#F0B429", hint: "Score gem" },
  { char: "T", label: "Trap", color: "#E0B860", hint: "Trap door" },
  { char: "~", label: "Slime", color: "#3DCF5A", hint: "Slow floor" },
  { char: "Z", label: "Shock", color: "#F0B429", hint: "Shock plate" },
  { char: "@", label: "Rift", color: "#C45AD8", hint: "Teleport (pairs)" },
  { char: "^", label: "Lift ↑", color: "#3DFFB5", hint: "One-way up" },
  { char: "v", label: "Lift ↓", color: "#F0B429", hint: "One-way down" },
];

export function brushColor(ch: MazeChar): string {
  return PALETTE.find((b) => b.char === ch)?.color ?? "#888";
}
