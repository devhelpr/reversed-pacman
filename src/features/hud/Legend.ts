/** Static legend describing maze tiles and hazards. */

import { createSlimeSprite } from "../../core/render/Sprites";

export interface LegendItem {
  id: string;
  swatchClass: string;
  label: string;
  detail: string;
  /** When set, legend uses this pixel sprite instead of a CSS swatch. */
  spriteUrl?: string;
}

const slimeSpriteUrl = createSlimeSprite(0).toDataURL();

export const LEGEND_ITEMS: LegendItem[] = [
  {
    id: "you",
    swatchClass: "swatch-you",
    label: "Robot",
    detail: "That's you — catch humans by touching them",
  },
  {
    id: "ghost",
    swatchClass: "swatch-ghost",
    label: "Human",
    detail: "Eats yellow dots — catch them all",
  },
  {
    id: "dot",
    swatchClass: "swatch-dot",
    label: "Dot",
    detail: "Score when left — you cannot eat these",
  },
  {
    id: "bonus",
    swatchClass: "swatch-bonus",
    label: "Bonus gem",
    detail: "You collect these for extra score",
  },
  {
    id: "bait",
    swatchClass: "swatch-bait",
    label: "Blue bait",
    detail: "You can eat it — humans hunt you briefly",
  },
  {
    id: "trapdoor",
    swatchClass: "swatch-trapdoor",
    label: "Trap door",
    detail: "Amber grate = safe · red/purple pit = deadly",
  },
  {
    id: "slime",
    swatchClass: "swatch-slime",
    label: "Slime",
    detail: "Slows you while you stand on it",
    spriteUrl: slimeSpriteUrl,
  },
  {
    id: "shock",
    swatchClass: "swatch-shock",
    label: "Shock plate",
    detail: "Periodically live — standing on it kills",
  },
  {
    id: "rift",
    swatchClass: "swatch-rift",
    label: "Rift",
    detail: "Teleports you to the paired rift (same floor)",
  },
  {
    id: "lift-up",
    swatchClass: "swatch-lift-up",
    label: "Lift up",
    detail: "One-way lift to the floor above (same cell)",
  },
  {
    id: "lift-down",
    swatchClass: "swatch-lift-down",
    label: "Lift down",
    detail: "One-way lift to the floor below (same cell)",
  },
  {
    id: "exit",
    swatchClass: "swatch-exit",
    label: "Exit",
    detail: "Reach after all humans are caught",
  },
];

export function legendListHtml(): string {
  return LEGEND_ITEMS.map((item) => {
    const swatch = item.spriteUrl
      ? `<img class="legend-swatch legend-swatch-sprite" src="${item.spriteUrl}" alt="" width="16" height="16" aria-hidden="true" />`
      : `<span class="legend-swatch ${item.swatchClass}" aria-hidden="true"></span>`;
    return `
      <li class="legend-item">
        ${swatch}
        <span class="legend-text">
          <strong>${item.label}</strong>
          <span>${item.detail}</span>
        </span>
      </li>
    `;
  }).join("");
}

export function createLegend(parent: HTMLElement): void {
  parent.innerHTML = `
    <aside class="legend" aria-label="Legenda">
      <h2 class="legend-title">Legenda</h2>
      <ul class="legend-list">
        ${legendListHtml()}
      </ul>
    </aside>
  `;
}
