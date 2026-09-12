/**
 * Shared config for the landing sun — the clickable ENTER ring that the
 * WebGL scene (space3d/solar/SunSvgAnchor) glues to the projected 3D
 * sun, and the handful of numbers that decide where on screen that sun
 * lands. This module must stay free of three.js imports (it's in the
 * main chunk), which is why the framing constants below live here rather
 * than beside the camera: the star sampler needs them too.
 */

export type PlanetKind = "mercury" | "venus" | "earth" | "mars";

// ─── Where the sun lands on screen ──────────────────────────────────
// The three numbers the projection turns on: the sun's world radius
// (solar/constants re-exports this as SUN_RADIUS), the scene camera's
// field of view (SolarScene) and the height the landing pose hovers at
// (CameraRig's LANDING_POS).
export const SUN_WORLD_RADIUS = 3;
export const SCENE_FOV_DEG = 55;
export const LANDING_CAM_HEIGHT = 35;

/** Phones park the sun's centre this far down the viewport (CameraRig
 *  pans the landing pose to put it there) */
export const LANDING_SUN_Y_SMALL = 2 / 3;

/**
 * ...and its sphere comes out this fraction of the viewport height as a
 * radius: the sun's radius over the visible half-height at its plane,
 * halved again because that half-height is half the viewport. Together
 * the two put the top of the sun at LANDING_SUN_Y_SMALL −
 * LANDING_SUN_RADIUS_FRACTION, which is what the phone landing's
 * signature A is centred above (starSampling).
 */
export const LANDING_SUN_RADIUS_FRACTION =
  SUN_WORLD_RADIUS /
  (Math.tan((SCENE_FOV_DEG * Math.PI) / 360) * LANDING_CAM_HEIGHT) /
  2;

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
