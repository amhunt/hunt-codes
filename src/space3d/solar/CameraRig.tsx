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
const TRANSITION_SECONDS = 3.2;

// scratch vectors, reused every frame
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const planetPos = new THREE.Vector3();
const toSun = new THREE.Vector3();

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Camera pos/look for a view at elapsed time t, written into goalPos/goalLook. */
function computeGoal(view: SolarView, t: number) {
  if (view === "landing") {
    goalPos.copy(LANDING_POS);
    goalLook.copy(ORIGIN);
  } else {
    // Perch just behind/above Earth on the far side from the sun, looking
    // toward the sun: Earth's limb fills the bottom of the frame and the
    // sun hangs just above the horizon.
    planetPosition(EARTH, t, planetPos);
    toSun.copy(planetPos).negate().normalize();
    goalPos.copy(planetPos).addScaledVector(toSun, -(EARTH.radius + 1.2));
    goalPos.y += EARTH.radius + 0.55; // above it, just over the limb
    goalLook.set(0, 2.1, 0); // slightly above the sun's center
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

    computeGoal(view, t);

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
