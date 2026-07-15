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

/**
 * Global tempo for the whole system: every orbit and self-spin below —
 * planets, asteroids, the moon (and therefore the /about camera, which
 * rides the moon's orbit) — scales together, preserving the relative
 * motion that keeps the co-rotating asteroids frozen on screen.
 */
const SPEED_SCALE = 0.5;

const EARTH_ORBIT_SPEED = 0.09 * SPEED_SCALE;
export const PLANETS: SolarPlanetConfig[] = [
  {
    name: "Mercury",
    kind: "mercury",
    radius: 0.55,
    orbitRadius: 7.5,
    orbitSpeed: EARTH_ORBIT_SPEED,
    orbitPhase: 0.6,
    spinSpeed: 0.12 * SPEED_SCALE,
  },
  {
    name: "Venus",
    kind: "venus",
    radius: 1.05,
    orbitRadius: 12,
    orbitSpeed: 0.14 * SPEED_SCALE,
    orbitPhase: 2.4,
    spinSpeed: -0.05 * SPEED_SCALE,
  },
  {
    name: "Earth",
    kind: "earth",
    radius: 1.6,
    orbitRadius: 17.5,
    orbitSpeed: EARTH_ORBIT_SPEED,
    orbitPhase: 4.2,
    spinSpeed: 0.03 * SPEED_SCALE,
  },
  {
    name: "Mars",
    kind: "mars",
    radius: 0.85,
    orbitRadius: 23.5,
    orbitSpeed: 0.065 * SPEED_SCALE,
    orbitPhase: 1.3,
    spinSpeed: 0.3 * SPEED_SCALE,
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
    spinSpeed: 0.2 * SPEED_SCALE,
    // Floats lower than its siblings: on the home view it reads nestled
    // down near the sun's limb instead of high among the other links
    yOffset: ASTEROID_Y - 1.2,
    logo: "blog",
  },
  {
    // Rendered as the Sputnik satellite (Satellite.tsx), which carries
    // its own GitHub badge — no decal `logo` needed
    name: "github",
    kind: "mercury",
    radius: 0.32,
    orbitRadius: 2.8,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 0.7,
    spinSpeed: -0.25 * SPEED_SCALE,
    yOffset: ASTEROID_Y,
  },
  {
    name: "linkedin",
    kind: "mercury",
    radius: 0.22,
    orbitRadius: 2.4,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 1.15,
    spinSpeed: 0.3 * SPEED_SCALE,
    logo: "linkedin",
    yOffset: ASTEROID_Y,
  },
  {
    // Rendered as the cartoon rocket (Rocket.tsx). Not a link: clicking
    // it launches the lightspeed joyride (rocketJourney.ts). Floats a
    // little above and outside the other links so it reads as its own
    // thing parked in the sky.
    name: "rocket",
    kind: "mercury",
    radius: 0.42,
    orbitRadius: 6.2,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase + 0.3,
    spinSpeed: 0.2 * SPEED_SCALE,
    yOffset: ASTEROID_Y + 1.4,
  },
];

export const ROCKET = ASTEROIDS.find((a) => a.name === "rocket")!;

/** Earth's moon — orbits Earth (not the sun), in the same XZ plane. */
export const MOON = {
  radius: 0.42,
  /** orbit radius around Earth's center */
  orbitRadius: 4,
  /** radians per second — slow, so the /about camera drifts gently */
  orbitSpeed: 0.18 * SPEED_SCALE,
  orbitPhase: 1.1,
  spinSpeed: 0.05 * SPEED_SCALE,
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
