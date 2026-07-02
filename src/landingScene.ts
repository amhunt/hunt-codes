/**
 * Shared config for the landing solar system. Single source of truth for
 * the SVG orbits/labels (Landing.tsx), the no-WebGL fallback animation
 * (useOrbitalAnimation) and the 3D planets (space3d/SolarSystem3D) — keep
 * these together so the drawn orbit rings and the rendered planets can't
 * drift apart. This module must stay free of three.js imports (it's in
 * the main chunk).
 */

export type PlanetKind = "mars" | "neptune" | "saturn" | "ice";

export interface LandingPlanetConfig {
  id: string;
  orbit: number;
  content: string;
  speed: number;
  angleKey: string;
  textNameOffset: number;
  /** Planet radius in viewBox units (SVG circle r / 3D sphere radius) */
  radius: number;
  /** Procedural texture family for the 3D sphere */
  kind: PlanetKind;
  /** Self-rotation, radians per second (3D only) */
  spinSpeed: number;
  /** Axial tilt in radians (3D only) */
  axialTilt: number;
}

export const PLANET_CONFIGS: LandingPlanetConfig[] = [
  {
    id: "planet1",
    orbit: 100,
    content: " ",
    speed: 2,
    angleKey: "angle1",
    textNameOffset: 30,
    radius: 4,
    kind: "mars",
    spinSpeed: 0.5,
    axialTilt: 0.1,
  },
  {
    id: "planet2",
    orbit: 160,
    content: "WORLD",
    speed: 1.8,
    angleKey: "angle2",
    textNameOffset: 28.5,
    radius: 8,
    kind: "neptune",
    spinSpeed: 0.35,
    axialTilt: 0.25,
  },
  {
    id: "planet3",
    orbit: 200,
    content: "HELLO",
    speed: 1.9,
    angleKey: "angle3",
    textNameOffset: 28.25,
    radius: 6,
    kind: "saturn",
    spinSpeed: 0.45,
    axialTilt: 0.45,
  },
  {
    id: "planet4",
    orbit: 240,
    content: " ",
    speed: 1.4,
    angleKey: "angle4",
    textNameOffset: 27.4,
    radius: 5,
    kind: "ice",
    spinSpeed: 0.3,
    axialTilt: 0.2,
  },
];

export const SOLAR_SYSTEM_SVG_ID = "solar-system";
export const SOLAR_SYSTEM_VIEWBOX = 600;
export const SOLAR_SYSTEM_CENTER = 300;

/**
 * Attribute set on the solar-system SVG while the WebGL scene owns the
 * planets and labels; useOrbitalAnimation yields while it is present.
 * The flat SVG planets are the always-on fallback — they render and
 * animate until the 3D scene takes over (and again if it goes away).
 */
export const RENDERED_3D_FLAG = "data-rendered-3d";

// The landing sun: SunInternals is rendered with these in Landing.tsx.
// Its disc center works out to outerRadius(200 * size) + radiusOffset.
export const SUN_SIZE = 0.25;
export const SUN_RADIUS_OFFSET = 243;
export const SUN_CENTER = 200 * SUN_SIZE + SUN_RADIUS_OFFSET;
// Covers the sun disc (inner radius ~44) so GPU stars don't draw over it
export const SUN_OCCLUDER_RADIUS = 47;

// Element ids inside the landing sun (SunInternals, rendered in Landing.tsx).
// The WebGL shader sun (space3d/sunShader) blanks these fills while it
// renders and restores them if it goes away — the same swap Moon3D does for
// the moon disc. Keep in sync with the ids in SunSvg.tsx.
export const SUN_CORE_ID = "circle-bg";
export const SUN_CLOUD_ID = "circle3";
// Shader-sun geometry, in viewBox units (~the SVG core inner radius)
export const SUN_SURFACE_RADIUS = 44;
export const SUN_CORONA_RADIUS = 110;
