/**
 * Proportions shared by the two curved ring labels — "ENTER" around the sun
 * (space3d/solar/Sun) and "ABOUT ME" around Earth (space3d/solar/AboutRing).
 * One set of numbers is what makes the pair read as the same kind of thing:
 * the same glyph size and the same standoff, measured against whichever body
 * the word rings.
 *
 * The numbers come from the DOM overlay the "ABOUT ME" ring replaced:
 * BodyAnchors sized that overlay to 1.55x the body's projected diameter, the
 * SVG text path sat at 41/50 of its radius, and the font was 13/100 of the
 * viewBox — the font has since been nudged up a point.
 *
 * Sizes come back in the same units as the `bodyRadius` handed in, so this
 * works equally in three.js world units and in the landing SVG's viewBox
 * (where SUN_SURFACE_RADIUS is the sun's radius). Keep it free of three.js
 * imports — Landing.tsx sizes the sun's click target from it, and that file
 * is in the main chunk.
 */

const OVERLAY_SCALE = 1.55;
const PATH_RADIUS_FRAC = 41 / 50;
const FONT_FRAC = 14 / 100;

export interface RingLabelMetrics {
  /** Radius the glyph centers ride */
  radius: number;
  /** Glyph em box height */
  fontSize: number;
  /** Outer edge of the glyphs — how far a hit target must reach to cover the word */
  outerRadius: number;
}

/** Ring label geometry for a body of `bodyRadius`, in the same units. */
export function ringLabelMetrics(bodyRadius: number): RingLabelMetrics {
  const overlayRadius = bodyRadius * OVERLAY_SCALE;
  const radius = overlayRadius * PATH_RADIUS_FRAC;
  const fontSize = overlayRadius * 2 * FONT_FRAC;
  return { radius, fontSize, outerRadius: radius + fontSize / 2 };
}
