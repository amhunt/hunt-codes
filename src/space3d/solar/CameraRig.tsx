import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, moonPosition, planetPosition, rigState } from "./constants";

/**
 * Camera choreography, ported from hunt-codes-3. Landing hovers straight
 * above the sun (the system reads as a flat orbital diagram). Home
 * perches just over the SUN's limb looking out toward Earth, so the
 * sun's top curve fills the bottom of the frame with mostly stars above
 * and Earth (moon alongside) hanging small in the middle distance. About
 * perches over EARTH's limb opposite the moon and rides the moon's
 * orbit, so Earth's top curve fills the foreground with the moon pinned
 * in view above-right of it. View changes swoop between the views over
 * a few seconds; once arrived the camera rides the moving goal.
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
// Earth's screen spot: on lg+ screens, pixel offsets from the viewport
// center; below that, fixed viewport fractions (same look, scaled down)
const HOME_EARTH_RIGHT_PX = 300;
const HOME_EARTH_UP_PX = 120;
const HOME_EARTH_NDC_X_SMALL = 0.4;
const HOME_EARTH_NDC_Y_SMALL = 0.28;

// About-view framing: the Earth-perch, placed on the side of Earth
// OPPOSITE the moon and co-rotating with the moon's orbit (the same way
// the old moon-perch rode it), so the moon is ALWAYS in frame, hovering
// just above Earth's horizon to the right. The perch is high enough that
// the camera->moon sightline clears Earth's limb (perpendicular ray
// distance ~1.9 > Earth's 1.6 radius) — lower perches put Earth squarely
// between camera and moon.
const ABOUT_CAM_BEHIND = 0.9; // from Earth's center, away from the moon
const ABOUT_CAM_ABOVE = 2.6;
const ABOUT_CAM_SIDE = 0.5;
const ABOUT_LOOK_HEIGHT = 0.45; // aim slightly above the moon's plane
/** Moon's horizontal screen spot on wide screens: NDC -0.5 = 25vw from
 *  the left edge. Below the lg breakpoint the camera drops its side
 *  offset instead, putting itself on the Earth-moon line so the moon
 *  reads dead-center, directly above Earth. */
const ABOUT_MOON_NDC_X = -0.5;
const LG_BREAKPOINT_PX = 1280;

// scratch vectors, reused every frame
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const earthPos = new THREE.Vector3();
const moonPos = new THREE.Vector3();
const toEarth = new THREE.Vector3();
const moonDir = new THREE.Vector3();
const viewDir = new THREE.Vector3();
const side = new THREE.Vector3();

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Camera pos/look for a view at elapsed time t, written into goalPos/goalLook. */
function computeGoal(
  view: SolarView,
  t: number,
  camera: THREE.Camera,
  viewport: { width: number; height: number },
) {
  if (view === "landing") {
    goalPos.copy(LANDING_POS);
    goalLook.copy(ORIGIN);
  } else if (view === "about") {
    // Perch over Earth's limb opposite the moon, riding the moon's orbit:
    // Earth's top curve fills the bottom of the frame and the moon stays
    // pinned in view, floating over the horizon.
    planetPosition(EARTH, t, earthPos);
    moonPosition(t, moonPos);
    moonDir.copy(moonPos).sub(earthPos).normalize();
    side.crossVectors(moonDir, UP).normalize();
    const centered = viewport.width < LG_BREAKPOINT_PX;
    goalPos
      .copy(earthPos)
      .addScaledVector(moonDir, -ABOUT_CAM_BEHIND)
      // Centered (sm/md): sit right on the Earth-moon line so the moon
      // reads directly above Earth
      .addScaledVector(side, centered ? 0 : ABOUT_CAM_SIDE);
    goalPos.y += ABOUT_CAM_ABOVE;
    goalLook.copy(moonPos);
    goalLook.y = moonPos.y + ABOUT_LOOK_HEIGHT;
    if (!centered) {
      // Aim sideways of the moon by the angle that lands it at
      // ABOUT_MOON_NDC_X for the current aspect (~25vw from the left)
      const persp = camera as THREE.PerspectiveCamera;
      const tanHalfH =
        Math.tan((persp.fov * Math.PI) / 360) * (persp.aspect || 1);
      const lateral = goalPos.distanceTo(moonPos) * ABOUT_MOON_NDC_X * tanHalfH;
      goalLook.addScaledVector(side, -lateral);
    }
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
    // Aim so Earth lands right of and above the viewport center (aiming
    // left of / below a body pushes it right / up on screen)
    const persp = camera as THREE.PerspectiveCamera;
    const tanHalfV = Math.tan((persp.fov * Math.PI) / 360);
    const tanHalfH = tanHalfV * (persp.aspect || 1);
    const lg = viewport.width >= LG_BREAKPOINT_PX;
    const ndcX = lg
      ? HOME_EARTH_RIGHT_PX / (viewport.width / 2)
      : HOME_EARTH_NDC_X_SMALL;
    const ndcY = lg
      ? HOME_EARTH_UP_PX / (viewport.height / 2)
      : HOME_EARTH_NDC_Y_SMALL;
    const d = goalPos.distanceTo(earthPos);
    goalLook.copy(earthPos).addScaledVector(side, -ndcX * d * tanHalfH);
    goalLook.y = earthPos.y - ndcY * d * tanHalfV;
  }
}

export default function CameraRig({ view }: { view: SolarView }) {
  const activeView = useRef(view);
  const transitionStart = useRef(-Infinity);
  const fromPos = useRef(LANDING_POS.clone());
  const fromLook = useRef(ORIGIN.clone());

  useFrame(({ camera, clock, size }) => {
    const t = clock.elapsedTime;

    if (view !== activeView.current) {
      // view changed: swoop from wherever the camera is right now
      activeView.current = view;
      transitionStart.current = t;
      fromPos.current.copy(camera.position);
      camera.getWorldDirection(viewDir);
      fromLook.current.copy(camera.position).addScaledVector(viewDir, 20);
    }

    computeGoal(view, t, camera, size);

    const p = Math.min(1, (t - transitionStart.current) / TRANSITION_SECONDS);
    rigState.settled = p >= 1;
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
