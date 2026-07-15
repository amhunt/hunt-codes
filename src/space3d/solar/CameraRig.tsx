import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, moonPosition, planetPosition, rigState } from "./constants";
import { starPanState } from "../starPan";
import { scrollTransitionState } from "../../scrollTransition";
import { journeyState } from "../../rocketJourney";
import { SYNTH_CAM_HEIGHT, SYNTH_ORIGIN } from "../../synthSpec";

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

export type SolarView = "landing" | "home" | "about" | "synth";

// Height tuned so Earth's orbit (r 17.5) nearly reaches the bottom edge
// (~16px margin on a laptop): visible half-height = tan(fov/2)·y ≈ .52·35.
// Mars' orbit clips top/bottom at this zoom — intentional.
const LANDING_POS = new THREE.Vector3(0, 35, 0.01);
const ORIGIN = new THREE.Vector3(0, 0, 0);
const UP = new THREE.Vector3(0, 1, 0);
const TRANSITION_SECONDS = 2;

// On lg/xl screens, pan the top-down landing camera straight down (world −Z
// is screen-up, so panning −Z drops the sun below center). A pure pan keeps
// the orbital diagram flat/undistorted rather than tilting it into ellipses.
// Expressed in vh below the viewport's vertical center (50vh = half-height).
const LANDING_SUN_DROP_VH = 15;

// Home-view framing: the sun-perch. Offsets from the SUN's center (r 3),
// on the far side from Earth, elevated well above the surface so the
// sun's limb only fills the bottom ~20% of the frame, with Earth ~9deg
// wide in the middle distance.
const HOME_CAM_BEHIND = 1.6; // away from Earth
const HOME_CAM_ABOVE = 5;
const HOME_CAM_SIDE = 2; // camera right => sun apex drifts screen-left
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
/** Extra downward aim, as an NDC fraction at the moon's distance: rotating
 *  the view down lifts the whole scene — the moon rides ~20vh higher and
 *  more of Earth's limb clears the bottom edge. */
const ABOUT_MOON_NDC_Y_LIFT = 0.4;
const LG_BREAKPOINT_PX = 1280;

// scratch values, reused every frame
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const earthPos = new THREE.Vector3();
const moonPos = new THREE.Vector3();
const toEarth = new THREE.Vector3();
const moonDir = new THREE.Vector3();
const side = new THREE.Vector3();
const goalQuat = new THREE.Quaternion();
const lookMatrix = new THREE.Matrix4();
const oldForward = new THREE.Vector3();
const invQuat = new THREE.Quaternion();
const scrubFromPos = new THREE.Vector3();
const scrubFromQuat = new THREE.Quaternion();
const scrubToQuat = new THREE.Quaternion();

/** How fast the rendered scrub progress chases the wheel target (per s) */
const SCRUB_EASE_RATE = 6;

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

/** Camera pos/look for a view at elapsed time t, written into goalPos/goalLook. */
function computeGoal(
  view: SolarView,
  t: number,
  camera: THREE.Camera,
  viewport: { width: number; height: number },
) {
  if (view === "synth") {
    // Straight down over the synth sun, like the landing view's orbital
    // diagram — the knob planets read as a control panel. Same 0.01 z
    // nudge to keep the lookAt out of the exact-degenerate pole case.
    goalPos.set(
      SYNTH_ORIGIN.x,
      SYNTH_ORIGIN.y + SYNTH_CAM_HEIGHT,
      SYNTH_ORIGIN.z + 0.01,
    );
    goalLook.set(SYNTH_ORIGIN.x, SYNTH_ORIGIN.y, SYNTH_ORIGIN.z);
  } else if (view === "landing") {
    if (viewport.width >= LG_BREAKPOINT_PX) {
      // Drop the sun below center by panning the camera + look target the
      // same amount in −Z (screen-down), so the view stays straight-down.
      const persp = camera as THREE.PerspectiveCamera;
      const tanHalfV = Math.tan((persp.fov * Math.PI) / 360);
      const drop = (LANDING_SUN_DROP_VH / 50) * tanHalfV * LANDING_POS.y;
      goalPos.set(LANDING_POS.x, LANDING_POS.y, LANDING_POS.z - drop);
      goalLook.set(0, 0, -drop);
    } else {
      goalPos.copy(LANDING_POS);
      goalLook.copy(ORIGIN);
    }
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
    const persp = camera as THREE.PerspectiveCamera;
    const tanHalfV = Math.tan((persp.fov * Math.PI) / 360);
    goalLook.copy(moonPos);
    goalLook.y =
      moonPos.y +
      ABOUT_LOOK_HEIGHT -
      goalPos.distanceTo(moonPos) * ABOUT_MOON_NDC_Y_LIFT * tanHalfV;
    if (!centered) {
      // Aim sideways of the moon by the angle that lands it at
      // ABOUT_MOON_NDC_X for the current aspect (~25vw from the left)
      const tanHalfH = tanHalfV * (persp.aspect || 1);
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

/** A view's camera goal at time t, written into the caller's vectors —
 *  the lightspeed journeys use it to drop the camera onto the
 *  destination's approach line before handing control back. */
export function viewGoal(
  view: SolarView,
  t: number,
  camera: THREE.Camera,
  viewport: { width: number; height: number },
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): void {
  computeGoal(view, t, camera, viewport);
  outPos.copy(goalPos);
  outLook.copy(goalLook);
}

export default function CameraRig({ view }: { view: SolarView }) {
  const activeView = useRef(view);
  const transitionStart = useRef(-Infinity);
  const fromPos = useRef(LANDING_POS.clone());
  const fromQuat = useRef(new THREE.Quaternion());
  const prevQuat = useRef<THREE.Quaternion | null>(null);
  const journeyHandoff = useRef(false);

  useFrame(({ camera, clock, size }, delta) => {
    const t = clock.elapsedTime;

    // The rocket joyride (RocketJourney, mounted before this so it runs
    // earlier in the frame) owns the camera while active. Track the view
    // so no stale swoop fires afterwards, and note the handoff so the
    // ride's end resumes as a fresh swoop from wherever it dropped the
    // camera. Star pan pauses too — the ride's teleports must not fold
    // into the background-star parallax.
    if (journeyState.phase !== "idle") {
      activeView.current = view;
      journeyHandoff.current = true;
      rigState.settled = false;
      prevQuat.current = null;
      return;
    }
    if (journeyHandoff.current) {
      journeyHandoff.current = false;
      transitionStart.current = t;
      fromPos.current.copy(camera.position);
      fromQuat.current.copy(camera.quaternion);
    }

    if (view !== activeView.current) {
      // view changed: swoop from wherever the camera is right now
      activeView.current = view;
      transitionStart.current = t;
      fromPos.current.copy(camera.position);
      fromQuat.current.copy(camera.quaternion);
    }

    const p = Math.min(1, (t - transitionStart.current) / TRANSITION_SECONDS);

    // Scroll scrub (Landing writes scrollTransitionState): once settled on
    // the landing view, wheel progress poses the camera part-way along the
    // landing→home swoop — chase the target so it glides, and park wherever
    // the user stops. The timed transition still owns arrival swoops (the
    // scrub only engages after it settles), and when the scrub completes
    // Landing navigates, making the ordinary home transition a no-op.
    const scrub = scrollTransitionState;
    if (view === "landing" && p >= 1) {
      scrub.progress +=
        (scrub.target - scrub.progress) * Math.min(1, delta * SCRUB_EASE_RATE);
      if (scrub.target === 0 && scrub.progress < 0.001) scrub.progress = 0;
    }
    const scrubbing = view === "landing" && p >= 1 && scrub.progress > 0;

    if (scrubbing) {
      // Pose between the two view goals by the eased scrub progress —
      // same lerp+slerp pairing as the timed transition below
      const e = easeInOutCubic(scrub.progress);
      computeGoal("landing", t, camera, size);
      scrubFromPos.copy(goalPos);
      lookMatrix.lookAt(goalPos, goalLook, UP);
      scrubFromQuat.setFromRotationMatrix(lookMatrix);
      computeGoal("home", t, camera, size);
      lookMatrix.lookAt(goalPos, goalLook, UP);
      scrubToQuat.setFromRotationMatrix(lookMatrix);
      camera.position.lerpVectors(scrubFromPos, goalPos, e);
      camera.quaternion.slerpQuaternions(scrubFromQuat, scrubToQuat, e);
      rigState.settled = false;
    } else {
      computeGoal(view, t, camera, size);
      rigState.settled = p >= 1;
      if (p < 1) {
        // Movement and rotation ride the same eased progress: the position
        // lerps to the perch while the orientation slerps to the arrival
        // pose, so the whole spin is spread evenly across the transition
        // (lerping a look POINT instead whipped the view around wherever
        // the point's chord passed near the camera — spin first, then zoom)
        const e = easeInOutCubic(p);
        camera.position.lerpVectors(fromPos.current, goalPos, e);
        lookMatrix.lookAt(goalPos, goalLook, UP);
        goalQuat.setFromRotationMatrix(lookMatrix);
        camera.quaternion.slerpQuaternions(fromQuat.current, goalQuat, e);
      } else {
        // fully arrived: track the (possibly moving) goal exactly
        camera.position.copy(goalPos);
        camera.lookAt(goalLook);
      }
    }

    // Star parallax: fold this frame's camera rotation into a pixel-space
    // pan (starPan.ts) by measuring where a distant point along LAST
    // frame's forward lands in the new camera frame. Delta-based, so it's
    // smooth through swoops, exact for the slow co-rotation on the home
    // and about perches, and immune to the straight-down landing pose
    // (where absolute yaw/pitch are degenerate).
    if (prevQuat.current === null) {
      prevQuat.current = camera.quaternion.clone();
    } else if (!camera.quaternion.equals(prevQuat.current)) {
      const persp = camera as THREE.PerspectiveCamera;
      oldForward.set(0, 0, -1).applyQuaternion(prevQuat.current);
      invQuat.copy(camera.quaternion).invert();
      oldForward.applyQuaternion(invQuat); // in current camera space
      if (oldForward.z < -0.1) {
        const focalPx = size.height / 2 / Math.tan((persp.fov * Math.PI) / 360);
        starPanState.x += (oldForward.x / -oldForward.z) * focalPx;
        starPanState.y += (oldForward.y / -oldForward.z) * focalPx;
      }
      prevQuat.current.copy(camera.quaternion);
    }
  });

  return null;
}
