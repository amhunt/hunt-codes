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
    spinSpeed: 0.35,
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
