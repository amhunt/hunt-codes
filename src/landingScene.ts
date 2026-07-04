/**
 * Shared config for the landing sun SVG — the clickable ENTER ring that
 * the WebGL scene (space3d/solar/SunSvgAnchor) glues to the projected 3D
 * sun. This module must stay free of three.js imports (it's in the main
 * chunk).
 */

export type PlanetKind = "mercury" | "venus" | "earth" | "mars";

export const SOLAR_SYSTEM_SVG_ID = "solar-system";

// The landing sun: SunInternals is rendered with these in Landing.tsx.
// Its disc center works out to outerRadius(200 * size) + radiusOffset.
export const SUN_SIZE = 0.25;
export const SUN_RADIUS_OFFSET = 243;
export const SUN_CENTER = 200 * SUN_SIZE + SUN_RADIUS_OFFSET;

// Element ids inside SunInternals (rendered by both the landing SVG and the
// home SunSvg — never simultaneously). The WebGL sun (space3d/Sun3D) blanks
// these fills, scoped to whichever sun svg it is glued to, and restores
// them if it goes away. Keep in sync with the ids in SunSvg.tsx.
export const SUN_CORE_ID = "circle-bg";
export const SUN_CLOUD_ID = "circle3";
// Landing sun disc radius in viewBox units (~the SVG core inner radius,
// 175 * SUN_SIZE)
export const SUN_SURFACE_RADIUS = 44;
