import * as THREE from "three";

/**
 * Counter-distortion for small off-axis spheres. A rectilinear
 * (perspective) projection renders a sphere as a circle only on the
 * optical axis; at off-axis angle theta its image stretches by ~1/cos
 * theta along the screen-radial direction — planets near the corners
 * read as eggs pointing away from screen center. Squashing the sphere by
 * cos theta along that same direction (in a camera-aligned wrapper, so
 * the body can keep spinning inside) cancels the stretch to first order
 * for small apparent sizes.
 *
 * The correction blends out as the camera closes in (below ~10 radii),
 * where the small-sphere approximation breaks and the true projection is
 * part of the tuned composition anyway (the perched sun on home, the
 * foreground Earth on about).
 */

const forward = new THREE.Vector3();
const toBody = new THREE.Vector3();
const radialDir = new THREE.Vector3();
const upDir = new THREE.Vector3();
const basis = new THREE.Matrix4();

// Full correction beyond FAR x radius, none below NEAR x radius
const BLEND_NEAR_RADII = 5;
const BLEND_FAR_RADII = 10;

/**
 * @param wrapper Outer group: rotated into the squash frame and scaled.
 * @param counterRotate Inner group (direct child of `wrapper`): receives
 *   the inverse rotation, so the net transform is R·S·R⁻¹ — a pure
 *   directional squash that leaves the body's world orientation alone.
 *   Without it the body is visibly REORIENTED to the camera frame: a
 *   textured globe reads upside down wherever the squash basis points
 *   its Y axis down, and camera swoops drag it through a tumble.
 */
export function applyOffAxisSquash(
  wrapper: THREE.Group,
  counterRotate: THREE.Group,
  camera: THREE.Camera,
  bodyWorldPos: THREE.Vector3,
  bodyRadius: number,
): void {
  camera.getWorldDirection(forward);
  toBody.copy(bodyWorldPos).sub(camera.position);
  const distance = toBody.length();

  const blend = THREE.MathUtils.clamp(
    (distance / bodyRadius - BLEND_NEAR_RADII) /
      (BLEND_FAR_RADII - BLEND_NEAR_RADII),
    0,
    1,
  );
  if (distance < 1e-4 || blend === 0) {
    wrapper.quaternion.identity();
    wrapper.scale.setScalar(1);
    counterRotate.quaternion.identity();
    return;
  }

  toBody.multiplyScalar(1 / distance);
  const cos = THREE.MathUtils.clamp(toBody.dot(forward), 1e-3, 1);
  radialDir.copy(toBody).addScaledVector(forward, -cos);
  const radialLength = radialDir.length();
  if (radialLength < 1e-4) {
    // On-axis: no distortion to cancel
    wrapper.quaternion.identity();
    wrapper.scale.setScalar(1);
    counterRotate.quaternion.identity();
    return;
  }
  radialDir.multiplyScalar(1 / radialLength);

  // Camera-aligned basis with local X on the screen-radial direction,
  // then squash X by cos theta (blended); the inner group undoes the
  // rotation so only the squash is left
  upDir.crossVectors(forward, radialDir).normalize();
  basis.makeBasis(radialDir, upDir, forward);
  wrapper.quaternion.setFromRotationMatrix(basis);
  wrapper.scale.set(1 - blend * (1 - cos), 1, 1);
  counterRotate.quaternion.copy(wrapper.quaternion).invert();
}
