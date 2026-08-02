/** Static legend describing maze tiles and hazards. */

export interface LegendItem {
  id: string;
  swatchClass: string;
  label: string;
  detail: string;
}

export const LEGEND_ITEMS: LegendItem[] = [
  {
    id: "you",
    swatchClass: "swatch-you",
    label: "You",
    detail: "Catch ghosts by touching them",
  },
  {
    id: "ghost",
    swatchClass: "swatch-ghost",
    label: "Ghost",
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
    detail: "You can eat it — ghosts hunt you briefly",
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
    detail: "Teleports you to the paired rift",
  },
  {
    id: "exit",
    swatchClass: "swatch-exit",
    label: "Exit",
    detail: "Reach after all ghosts are caught",
  },
];

export function createLegend(parent: HTMLElement): void {
  const items = LEGEND_ITEMS.map(
    (item) => `
      <li class="legend-item">
        <span class="legend-swatch ${item.swatchClass}" aria-hidden="true"></span>
        <span class="legend-text">
          <strong>${item.label}</strong>
          <span>${item.detail}</span>
        </span>
      </li>
    `,
  ).join("");

  parent.innerHTML = `
    <aside class="legend" aria-label="Legenda">
      <h2 class="legend-title">Legenda</h2>
      <ul class="legend-list">
        ${items}
      </ul>
    </aside>
  `;
}
