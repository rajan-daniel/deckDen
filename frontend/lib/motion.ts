import type { CSSProperties } from "react";

// Typed helpers for the CSS custom properties the motion styles in
// globals.css read. React's CSSProperties doesn't know custom properties, so
// they need a cast; keeping it here means components don't each repeat it.

/** How long to wait before a reveal or entrance starts, in milliseconds. */
export function revealDelay(ms: number): CSSProperties {
  return { "--reveal-delay": `${ms}ms` } as CSSProperties;
}

/** Position of an item within a staggered or fanned group. */
export function itemIndex(i: number): CSSProperties {
  return { "--i": i } as CSSProperties;
}

/** Delay for a load-time entrance (the .anim-rise and .line-mask classes). */
export function enterDelay(ms: number): CSSProperties {
  return { "--d": `${ms}ms` } as CSSProperties;
}

/** How far an .anim-rise entrance travels, e.g. "90px". The default is 26px. */
export function enterRise(distance: string): CSSProperties {
  return { "--rise": distance } as CSSProperties;
}

/** Gap between the items of a stagger group. The default is 90ms. */
export function staggerGap(ms: number): CSSProperties {
  return { "--stagger": `${ms}ms` } as CSSProperties;
}

/** Strength of the .parallax drift, as a percentage of the element's height. */
export function parallax(percent: number): CSSProperties {
  return { "--parallax": percent } as CSSProperties;
}

/** Merge a few of the helpers above onto one element. */
export function motionStyle(...styles: CSSProperties[]): CSSProperties {
  return Object.assign({}, ...styles);
}
