import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";

const CIRCULAR_SEGMENTS = 128;
/** Mercury's eccentric orbit needs extra resolution near perihelion. */
const PLANET_SEGMENTS = 192;

/** Builds a circle from a radius or samples a planet's eccentric and
 * inclined path. */
export function useOrbitRing(
  orbit: number | SolarPlanetConfig,
): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    if (typeof orbit === "number") {
      for (let i = 0; i <= CIRCULAR_SEGMENTS; i++) {
        const a = (i / CIRCULAR_SEGMENTS) * Math.PI * 2;
        points.push(
          new THREE.Vector3(Math.cos(a) * orbit, 0, Math.sin(a) * orbit),
        );
      }
    } else {
      // Sample one full mean-anomaly period regardless of starting phase.
      const period = (Math.PI * 2) / orbit.orbitSpeed;
      for (let i = 0; i <= PLANET_SEGMENTS; i++) {
        points.push(planetPosition(orbit, (i / PLANET_SEGMENTS) * period));
      }
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [orbit]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}
