import * as THREE from "three";

import type { PlanetKind } from "../../landingScene";

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
 * camera settles (the Earth "About Andrew" ring) read it.
 */
export const rigState = { settled: true };

export const PLANETS: SolarPlanetConfig[] = [
  {
    name: "Mercury",
    kind: "mercury",
    radius: 0.55,
    orbitRadius: 7.5,
    orbitSpeed: 0.22,
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
 * They're near-co-orbital with Earth on purpose — the home camera's look
 * direction sweeps around with Earth, so a truly slow asteroid would be
 * out of frame most of the time. With orbit speeds close to Earth's,
 * they drift across the view VERY slowly (relative ~0.01 rad/s).
 */
export const ASTEROIDS: SolarPlanetConfig[] = [
  {
    name: "recent",
    kind: "mercury",
    radius: 0.28,
    orbitRadius: 5.2,
    orbitSpeed: 0.082,
    orbitPhase: EARTH.orbitPhase + 0.35,
    spinSpeed: 0.6,
  },
  {
    name: "old",
    kind: "mercury",
    radius: 0.22,
    orbitRadius: 9.8,
    orbitSpeed: 0.098,
    orbitPhase: EARTH.orbitPhase - 0.3,
    spinSpeed: -0.45,
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
    0,
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
