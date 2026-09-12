import { useEffect, useMemo } from "react";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";

/** Enough segments that the dashes read as a circle rather than a polygon */
const CIRCULAR_SEGMENTS = 128;
/** Mercury's eccentric orbit needs a little more resolution at perihelion */
const PLANET_SEGMENTS = 192;

/**
 * The dashed path an orbit is drawn with. A numeric radius produces a circle
 * in the XZ plane for the moon and synth pads. A planet config is sampled via
 * `planetPosition`, so eccentricity and inclination stay in lockstep with the
 * body's actual path.
 *
 * One geometry per radius/config, disposed with the component that asked for
 * it.
 */
export function useOrbitRing(
  orbit: number | SolarPlanetConfig,
): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    if (typeof orbit === "number") {
      for (let i = 0; i <= CIRCULAR_SEGMENTS; i++) {
        const a = (i / CIRCULAR_SEGMENTS) * Math.PI * 2;
        points.push(
          new THREE.Vector3(
            Math.cos(a) * orbit,
            0,
            Math.sin(a) * orbit,
          ),
        );
      }
    } else {
      // One full period of mean anomaly covers the orbit whatever its phase.
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
