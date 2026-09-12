import { useEffect, useMemo } from "react";
import * as THREE from "three";

/** Enough segments that the dashes read as a circle rather than a polygon */
const SEGMENTS = 128;

/**
 * The dashed circle an orbit is drawn with, in the XZ plane about the
 * origin — the same plane `planetPosition`/`moonPosition` move bodies in
 * (constants.ts), so a ring and the body on it always agree.
 *
 * One geometry per radius, disposed with the component that asked for it.
 */
export function useOrbitRing(radius: number): THREE.BufferGeometry {
  const geometry = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= SEGMENTS; i++) {
      const a = (i / SEGMENTS) * Math.PI * 2;
      points.push(
        new THREE.Vector3(Math.cos(a) * radius, 0, Math.sin(a) * radius),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}
