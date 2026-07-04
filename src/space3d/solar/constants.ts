import * as THREE from "three";

import type { PlanetKind } from "../../landingScene";
import type { AsteroidLogo } from "../textures";

/**
 * The 3D solar system, ported from the hunt-codes-3 prototype. World
 * units are hunt-codes-3's: sun radius 3, planets orbiting in the XZ
 * plane, camera hovering at y=58 for the top-down landing view. The
 * flat SVG solar system (landingScene.ts) remains the no-WebGL fallback
 * and keeps its own, unrelated viewBox units.
 */

export interface SolarPlanetConfig {
  name: string;
  kind: PlanetKind;
  radius: number;
  orbitRadius: number;
  /** radians per second */
  orbitSpeed: number;
  /** starting angle, radians */
  orbitPhase: number;
  /** radians per second of self-rotation */
  spinSpeed: number;
  /** Vertical (world-Y) offset from the orbital plane, world units.
   *  Planets sit at y=0; asteroids float a bit higher (near the sun's
   *  top) so they don't read as level with the sun's equator. */
  yOffset?: number;
  /** Brand badge decal projected onto both sides of the body (asteroids
   *  with a logo also spin upright-only so the mark stays readable) */
  logo?: AsteroidLogo;
}

export const SUN_RADIUS = 3;

/**
 * The sun's current rendered scale multiplier (it grows a bit for the
 * home view). Written by Sun each frame; read by SunSvgAnchor so the DOM
 * rings track the rendered size, not just the base radius.
 */
export const sunState = { scale: 1 };

/**
 * Whether the camera has finished its swoop to the current view. Written
 * by CameraRig each frame; overlays that should only appear once the
 * camera settles (the Earth "About Me" ring) read it.
 */
export const rigState = { settled: true };

const EARTH_ORBIT_SPEED = 0.09;
export const PLANETS: SolarPlanetConfig[] = [
  {
    name: "Mercury",
    kind: "mercury",
    radius: 0.55,
    orbitRadius: 7.5,
    orbitSpeed: EARTH_ORBIT_SPEED,
    orbitPhase: 0.6,
    spinSpeed: 0.12,
  },
  {
    name: "Venus",
    kind: "venus",
    radius: 1.05,
    orbitRadius: 12,
    orbitSpeed: 0.14,
    orbitPhase: 2.4,
    spinSpeed: -0.05,
  },
  {
    name: "Earth",
    kind: "earth",
    radius: 1.6,
    orbitRadius: 17.5,
    orbitSpeed: 0.09,
    orbitPhase: 4.2,
    spinSpeed: 0.03,
  },
  {
    name: "Mars",
    kind: "mars",
    radius: 0.85,
    orbitRadius: 23.5,
    orbitSpeed: 0.065,
    orbitPhase: 1.3,
    spinSpeed: 0.3,
  },
];

export const EARTH = PLANETS.find((p) => p.name === "Earth")!;

/**
 * Link asteroids: small rocks that float near the sun in the home view.
 * They orbit at exactly Earth's angular speed — the home camera co-rotates
 * with Earth, so matching it freezes them in place on screen, keeping
 * both links visible at fixed spots.
 *
 * They float `ASTEROID_Y` above the orbital plane so they line up roughly
 * with the top of the sun rather than its equator.
 */
const ASTEROID_Y = SUN_RADIUS;
export const ASTEROIDS: SolarPlanetConfig[] = [
  {
    name: "recent",
    kind: "mercury",
    radius: 0.28,
    orbitRadius: 4.2,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase + 0.35,
    spinSpeed: 0.2,
    yOffset: ASTEROID_Y,
    logo: "blog",
  },
  {
    name: "github",
    kind: "mercury",
    radius: 0.32,
    orbitRadius: 2.8,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 0.7,
    spinSpeed: -0.25,
    logo: "github",
    yOffset: ASTEROID_Y,
  },
  {
    name: "linkedin",
    kind: "mercury",
    radius: 0.22,
    orbitRadius: 2.4,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 1.15,
    spinSpeed: 0.3,
    logo: "linkedin",
    yOffset: ASTEROID_Y,
  },
];

/** Earth's moon — orbits Earth (not the sun), in the same XZ plane. */
export const MOON = {
  radius: 0.42,
  /** orbit radius around Earth's center */
  orbitRadius: 4,
  /** radians per second — slow, so the /about camera drifts gently */
  orbitSpeed: 0.18,
  orbitPhase: 1.1,
  spinSpeed: 0.05,
};

/** Position of a planet at elapsed time t (seconds). */
export function planetPosition(
  p: SolarPlanetConfig,
  t: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const angle = p.orbitPhase + t * p.orbitSpeed;
  return out.set(
    Math.cos(angle) * p.orbitRadius,
    p.yOffset ?? 0,
    Math.sin(angle) * p.orbitRadius,
  );
}

const moonEarthScratch = new THREE.Vector3();

/** World position of the moon at elapsed time t = Earth's position + its
 *  own orbit around Earth. */
export function moonPosition(
  t: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  planetPosition(EARTH, t, moonEarthScratch);
  const a = MOON.orbitPhase + t * MOON.orbitSpeed;
  return out.set(
    moonEarthScratch.x + Math.cos(a) * MOON.orbitRadius,
    0,
    moonEarthScratch.z + Math.sin(a) * MOON.orbitRadius,
  );
}
