import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, planetPosition } from "./constants";

/**
 * Camera choreography, ported from hunt-codes-3. Landing hovers straight
 * above the sun (the system reads as a flat orbital diagram); home
 * perches just behind/above Earth on the far side from the sun, so
 * Earth's limb fills the bottom of the frame with the sun hanging above
 * the horizon while the other planets keep orbiting it. View changes
 * swoop between the two over a few seconds, and once arrived the camera
 * keeps riding Earth around its orbit.
 */

export type SolarView = "landing" | "home";

const LANDING_POS = new THREE.Vector3(0, 58, 0.01);
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const TRANSITION_SECONDS = 3.2;

// Home-view framing. The camera hugs Earth so closely that its limb
// spans the whole bottom of the frame (Earth reads ~2x the viewport
// wide), drifted slightly left; the sun is pinned a fixed fraction of
// the viewport right of center.
const HOME_CAM_BEHIND = 1.1; // from Earth's center, away from the sun
const HOME_CAM_ABOVE = 2;
const HOME_CAM_SIDE = 0.4; // camera right => Earth drifts screen-left
const HOME_LOOK_HEIGHT = 2.1;
/** Sun's horizontal screen position: +0.4 of the half-width = ~20vw right */
const HOME_SUN_SCREEN_X = 0.4;

// scratch vectors, reused every frame
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const planetPos = new THREE.Vector3();
const toSun = new THREE.Vector3();
const side = new THREE.Vector3();

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Camera pos/look for a view at elapsed time t, written into goalPos/goalLook. */
function computeGoal(view: SolarView, t: number, camera: THREE.Camera) {
  if (view === "landing") {
    goalPos.copy(LANDING_POS);
    goalLook.copy(ORIGIN);
  } else {
    // Perch just over Earth's limb on the far side from the sun, looking
    // sunward: Earth's top curve fills the bottom of the frame.
    planetPosition(EARTH, t, planetPos);
    toSun.copy(planetPos).negate().normalize();
    side.crossVectors(toSun, UP).normalize(); // screen-right, looking sunward
    goalPos
      .copy(planetPos)
      .addScaledVector(toSun, -HOME_CAM_BEHIND)
      .addScaledVector(side, HOME_CAM_SIDE);
    goalPos.y += HOME_CAM_ABOVE;

    // Aim left of the sun by the angle that lands it HOME_SUN_SCREEN_X of
    // the half-width right of center, whatever the viewport aspect
    const persp = camera as THREE.PerspectiveCamera;
    const halfFovH =
      Math.tan((persp.fov * Math.PI) / 360) * (persp.aspect || 1);
    const lateral = goalPos.length() * HOME_SUN_SCREEN_X * halfFovH;
    goalLook
      .set(0, HOME_LOOK_HEIGHT, 0)
      .addScaledVector(side, -lateral);
  }
}

export default function CameraRig({ view }: { view: SolarView }) {
  const activeView = useRef(view);
  const transitionStart = useRef(-Infinity);
  const fromPos = useRef(LANDING_POS.clone());
  const fromLook = useRef(ORIGIN.clone());

  useFrame(({ camera, clock }) => {
    const t = clock.elapsedTime;

    if (view !== activeView.current) {
      // view changed: swoop from wherever the camera is right now
      activeView.current = view;
      transitionStart.current = t;
      fromPos.current.copy(camera.position);
      camera.getWorldDirection(toSun);
      fromLook.current.copy(camera.position).addScaledVector(toSun, 20);
    }

    computeGoal(view, t, camera);

    const p = Math.min(1, (t - transitionStart.current) / TRANSITION_SECONDS);
    if (p < 1) {
      const e = easeInOutCubic(p);
      camera.position.lerpVectors(fromPos.current, goalPos, e);
      goalLook.lerpVectors(fromLook.current, goalLook, e);
      camera.lookAt(goalLook);
    } else {
      // fully arrived: track the (possibly moving) goal exactly
      camera.position.copy(goalPos);
      camera.lookAt(goalLook);
    }
  });

  return null;
}
