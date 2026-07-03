import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, MOON, planetPosition } from "./constants";

/**
 * Camera choreography, ported from hunt-codes-3. Landing hovers straight
 * above the sun (the system reads as a flat orbital diagram). Home
 * perches just over the SUN's limb looking out toward Earth, so the
 * sun's top curve fills the bottom of the frame with mostly stars above
 * and Earth (moon alongside) hanging small in the middle distance. About
 * perches over EARTH's limb looking anti-sunward at the moon's orbit
 * band, so Earth's top curve fills the foreground and the moon drifts
 * through the background as it circles. View changes swoop between the
 * views over a few seconds; once arrived the camera rides the moving goal.
 */

export type SolarView = "landing" | "home" | "about";

// Height tuned so Earth's orbit (r 17.5) nearly reaches the bottom edge
// (~16px margin on a laptop): visible half-height = tan(fov/2)·y ≈ .52·35.
// Mars' orbit clips top/bottom at this zoom — intentional.
const LANDING_POS = new THREE.Vector3(0, 35, 0.01);
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const TRANSITION_SECONDS = 3.2;

// Home-view framing: the sun-perch. Offsets from the SUN's center (r 3),
// on the far side from Earth, elevated — camera ends up ~0.9 above the
// surface (well clear of the 0.1 near plane) with the sun's limb filling
// the bottom third and Earth ~9deg wide in the middle distance.
const HOME_CAM_BEHIND = 1.6; // away from Earth
const HOME_CAM_ABOVE = 3.4;
const HOME_CAM_SIDE = 1; // camera right => sun apex drifts screen-left
const HOME_LOOK_HEIGHT = 3; // raise the aim so Earth sits below center

// About-view framing: the Earth-perch (same proven offsets the old home
// view used), now placed on the SUNWARD side of Earth because the camera
// looks anti-sunward at the moon's orbit band. The aim is a stable point
// on that band — NOT the moon itself, whose closest approach would slew
// the camera ~20deg/s — so the moon drifts through frame twice per orbit,
// growing as it passes near the camera.
const ABOUT_CAM_BEHIND = 0.85; // from Earth's center, toward the sun
const ABOUT_CAM_ABOVE = 1.8;
const ABOUT_CAM_SIDE = 0.55;
const ABOUT_LOOK_HEIGHT = 1.2;

// scratch vectors, reused every frame
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const earthPos = new THREE.Vector3();
const toEarth = new THREE.Vector3();
const antiSun = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const side = new THREE.Vector3();

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Camera pos/look for a view at elapsed time t, written into goalPos/goalLook. */
function computeGoal(view: SolarView, t: number) {
  if (view === "landing") {
    goalPos.copy(LANDING_POS);
    goalLook.copy(ORIGIN);
  } else if (view === "about") {
    // Perch over Earth's limb on the sunward side, looking anti-sunward:
    // Earth's top curve fills the bottom of the frame and the moon drifts
    // through the background as it orbits.
    planetPosition(EARTH, t, earthPos);
    antiSun.copy(earthPos).normalize(); // away from the sun (origin)
    side.crossVectors(antiSun, UP).normalize();
    goalPos
      .copy(earthPos)
      .addScaledVector(antiSun, -ABOUT_CAM_BEHIND)
      .addScaledVector(side, ABOUT_CAM_SIDE);
    goalPos.y += ABOUT_CAM_ABOVE;
    // Stable aim at the moon's orbit band (not the moon itself)
    goalLook.copy(earthPos).addScaledVector(antiSun, MOON.orbitRadius);
    goalLook.y += ABOUT_LOOK_HEIGHT;
  } else {
    // Perch just over the sun's limb on the far side from Earth, looking
    // out at the stars: the sun's top curve fills the bottom of the frame
    // and Earth (with its moon) hangs small in the middle distance.
    planetPosition(EARTH, t, earthPos);
    toEarth.copy(earthPos).normalize();
    side.crossVectors(toEarth, UP).normalize();
    goalPos
      .set(0, 0, 0)
      .addScaledVector(toEarth, -HOME_CAM_BEHIND)
      .addScaledVector(side, HOME_CAM_SIDE);
    goalPos.y += HOME_CAM_ABOVE;
    goalLook.copy(earthPos);
    goalLook.y += HOME_LOOK_HEIGHT;
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
      camera.getWorldDirection(viewDir);
      fromLook.current.copy(camera.position).addScaledVector(viewDir, 20);
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
