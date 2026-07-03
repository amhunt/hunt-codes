import * as THREE from "three";

/**
 * Shared camera->screen projection for the DOM overlays that ride 3D
 * bodies (the sun rings, the Earth "About Andrew" ring, the asteroid
 * links). Positions come out in CSS pixels; projR is the body's apparent
 * radius on screen.
 */

export interface ProjectedBody {
  /** CSS px of the body's center */
  x: number;
  y: number;
  /** Apparent radius of the body, CSS px */
  projR: number;
  /** False when the body is behind the camera (project() mirrors those
   *  coordinates, which would teleport overlays during swoops) */
  inFront: boolean;
}

const camSpace = new THREE.Vector3();
const ndc = new THREE.Vector3();

export function projectBody(
  camera: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  worldPos: THREE.Vector3,
  worldRadius: number,
  out: ProjectedBody,
): ProjectedBody {
  camSpace.copy(worldPos).applyMatrix4(camera.matrixWorldInverse);
  out.inFront = camSpace.z < -camera.near;

  ndc.copy(worldPos).project(camera);
  out.x = (ndc.x * 0.5 + 0.5) * size.width;
  out.y = (0.5 - ndc.y * 0.5) * size.height;

  const distance = camera.position.distanceTo(worldPos);
  out.projR =
    (worldRadius / Math.max(distance, 1e-6) /
      Math.tan((camera.fov * Math.PI) / 360)) *
    (size.height / 2);
  return out;
}
