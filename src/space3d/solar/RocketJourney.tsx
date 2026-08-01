import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, ROCKET, SYNTH_PAD } from "./constants";
import { rocketNoseDirection } from "./Rocket";
import { viewGoal, type SolarView } from "./CameraRig";
import { CRUISE_POS, CRUISE_QUAT } from "./JourneyCruise";
import WarpStreaks from "./WarpStreaks";
import { endRocketJourney, flashWarp, journeyState } from "../../rocketJourney";
import { SYNTH_ORIGIN } from "../../synthSpec";

/**
 * Drives the lightspeed journeys' boarding beats and the 808-pad
 * transits to the synth solar system and back. While journeyState is
 * active this component owns the camera (CameraRig stands down) — with
 * one handoff: the rocket ride's warp is the /journey cruise, owned by
 * JourneyCruise, so once that ride reaches warp this driver goes quiet.
 *
 * The beats:
 *
 * 1. Boarding: the camera swoops toward the journey's vehicle (behind
 *    the rocket's nose, or down over the 808 pad; the synth return just
 *    swings the nose around toward home) while the stars fade and the
 *    DOM windshield frame fades in (App.scss, `body.rocket-journey`).
 * 2. Warp: a flash covers a teleport along the travel heading. For the
 *    rocket ride the teleport is straight to the /journey cruise pose —
 *    the route flips under the flash and JourneyCruise takes the camera
 *    (the story crawl decides when that warp ends). The synth transits
 *    stay here: parked in a "warp zone" far from every system, inside
 *    the Star Wars streak field, while the camera sways gently.
 * 3. Re-entry (synth transits only): a second flash covers a teleport
 *    onto the destination view's approach line (navigating to its route
 *    if needed), then the journey ends and CameraRig's ordinary resume
 *    swoop glides the last stretch onto the perch — the landing.
 *
 * The streaks are one LineSegments whose head vertices march toward the
 * camera and wrap; line length and material opacity ride the warp
 * intensity envelope, so the field stretches out of nothing at the jump
 * and collapses back to nothing before re-entry.
 */

const BOARD_CAM_BEHIND = 1.5;
/** The pad boarding parks a bit further back — it's flat and wide */
const BOARD_PAD_BEHIND = 2.2;
const BOARD_LOOK_AHEAD = 10;

/** Transit warp zone: this far past the boarding spot along the heading
 *  (roughly a quarter of the way to the other system) */
const TRANSIT_WARP_AHEAD = 450;
/** Intensity envelope: streaks stretch in/out over these ramps */
const WARP_RAMP_IN_SECONDS = 0.9;
const WARP_RAMP_OUT_SECONDS = 1;
/** Stars fade back in over the last stretch of warp (decelerating) */
const STAR_RETURN_SECONDS = 1.2;

/** How far out on the destination's approach line re-entry drops the
 *  camera (the synth view sits closer, so its approach is shorter) */
const REENTRY_DISTANCE = 130;
const SYNTH_REENTRY_DISTANCE = 90;

const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const SYNTH_ORIGIN_VEC = new THREE.Vector3(
  SYNTH_ORIGIN.x,
  SYNTH_ORIGIN.y,
  SYNTH_ORIGIN.z,
);

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
const clamp01 = (x: number) => THREE.MathUtils.clamp(x, 0, 1);

// scratch values, reused every frame
const refPos = new THREE.Vector3();
const travelDir = new THREE.Vector3();
const targetPos = new THREE.Vector3();
const targetQuat = new THREE.Quaternion();
const lookTarget = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();
const sway = new THREE.Vector3();
const rollQuat = new THREE.Quaternion();
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const forward = new THREE.Vector3();

export default function RocketJourney({
  view,
  navigate,
}: {
  view: SolarView;
  /** Router navigation, threaded in from outside the canvas (context
   *  doesn't cross the R3F reconciler boundary) — the rocket ride hops
   *  to /journey at its warp flash; re-entry uses it when the
   *  destination lives on another route */
  navigate: (to: string) => void;
}) {
  const rig = useRef<THREE.Group>(null);
  /** Warp intensity envelope, read by the shared streak field per frame */
  const warpIntensity = useRef(0);

  const startPos = useRef(new THREE.Vector3());
  const startQuat = useRef(new THREE.Quaternion());
  const startCaptured = useRef(false);
  const originView = useRef<SolarView>(view);
  /** True once the destination view's route has been seen this ride —
   *  the 808 transit flips the URL at boarding, so the dest view arriving
   *  mid-ride is expected, not an abort. */
  const sawDestView = useRef(false);
  const warpPos = useRef(new THREE.Vector3());
  const warpQuat = useRef(new THREE.Quaternion());

  // The overlay button only launches while this driver is mounted, and
  // an abandoned ride (unmount mid-journey) must not leave the page UI
  // hidden behind the body class
  useEffect(() => {
    journeyState.driverAlive = true;
    return () => {
      journeyState.driverAlive = false;
      endRocketJourney();
    };
  }, []);

  useFrame(({ camera, clock, size }, rawDelta) => {
    const state = journeyState;
    if (state.phase === "idle") {
      if (rig.current?.visible) rig.current.visible = false;
      startCaptured.current = false;
      warpIntensity.current = 0;
      return;
    }
    // The rocket ride's warp lives on /journey — JourneyCruise owns the
    // camera (and the show) from the flash on; this driver stands down
    if (state.destination === "journey" && state.phase === "warp") {
      if (rig.current?.visible) rig.current.visible = false;
      startCaptured.current = false;
      warpIntensity.current = 0;
      return;
    }
    // Route change mid-ride (browser back): abort and let CameraRig
    // swoop to the new view from wherever the camera is. The journey's
    // own routes don't count: the origin view is where it boarded, and
    // the destination view arrives mid-ride by design (the 808 transit
    // flips the URL at boarding). Once the destination view has been
    // seen, leaving it again (back mid-warp) is a real abort.
    const rideDestView: SolarView =
      state.destination === "synth"
        ? "synth"
        : state.destination === "journey"
          ? "journey"
          : "home";
    if (startCaptured.current) {
      if (view === rideDestView) sawDestView.current = true;
      const foreign = sawDestView.current
        ? view !== rideDestView
        : view !== originView.current && view !== rideDestView;
      if (foreign) {
        if (rig.current) rig.current.visible = false;
        startCaptured.current = false;
        endRocketJourney();
        return;
      }
    }

    const t = clock.elapsedTime;
    // Clamped like StarField's fades: a backgrounded tab must pause the
    // ride, not fast-forward it past the whole show on the first frame back
    const delta = Math.min(rawDelta, 0.1);
    state.phaseElapsed += delta;

    if (state.phase === "boarding") {
      if (!startCaptured.current) {
        startCaptured.current = true;
        originView.current = view;
        sawDestView.current = view === rideDestView;
        startPos.current.copy(camera.position);
        startQuat.current.copy(camera.quaternion);
      }
      // Chase pose + travel heading, per vehicle
      if (state.vehicle === "rocket") {
        // Behind the rocket, sighted along its nose
        planetPosition(ROCKET, t, refPos);
        rocketNoseDirection(t, travelDir);
        targetPos.copy(refPos).addScaledVector(travelDir, -BOARD_CAM_BEHIND);
      } else if (state.vehicle === "pad") {
        // Over the 808 pad, sighted through it toward the synth system
        planetPosition(SYNTH_PAD, t, refPos);
        travelDir.copy(SYNTH_ORIGIN_VEC).sub(refPos).normalize();
        targetPos.copy(refPos).addScaledVector(travelDir, -BOARD_PAD_BEHIND);
      } else {
        // Return trip: no vehicle — hold position and swing the nose
        // around toward the home system
        targetPos.copy(startPos.current);
        travelDir.copy(startPos.current).multiplyScalar(-1).normalize();
      }
      lookTarget.copy(targetPos).addScaledVector(travelDir, BOARD_LOOK_AHEAD);
      lookMatrix.lookAt(targetPos, lookTarget, UP);
      targetQuat.setFromRotationMatrix(lookMatrix);

      // Boarding for /journey while already ON /journey (a mid-boarding
      // manual navigation) has no rocket to chase — jump straight to warp
      const p =
        state.destination === "journey" && view === "journey"
          ? 1
          : clamp01(state.phaseElapsed / state.boardSeconds);
      const e = easeInOutCubic(p);
      camera.position.lerpVectors(startPos.current, targetPos, e);
      camera.quaternion.slerpQuaternions(startQuat.current, targetQuat, e);
      // Stars fade with the approach; the flash + streaks take over
      state.starDim = e;

      if (p >= 1) {
        state.phase = "warp";
        state.phaseElapsed = 0;
        flashWarp();
        if (state.destination === "journey") {
          // The rocket ride: teleport straight to the /journey cruise
          // pose and flip the route — both cuts hide under the flash,
          // and JourneyCruise picks the camera up from exactly here
          camera.position.copy(CRUISE_POS);
          camera.quaternion.copy(CRUISE_QUAT);
          startCaptured.current = false;
          if (view !== "journey") navigate("/journey");
          return;
        }
        // Jump along the current heading: same orientation, new spot —
        // the flash covers the position cut, the view direction doesn't
        // change, and every solar system ends up a speck
        warpPos.current
          .copy(targetPos)
          .addScaledVector(travelDir, TRANSIT_WARP_AHEAD);
        warpQuat.current.copy(targetQuat);
        camera.position.copy(warpPos.current);
        camera.quaternion.copy(warpQuat.current);
        if (rig.current) {
          rig.current.position.copy(warpPos.current);
          rig.current.quaternion.copy(warpQuat.current);
          rig.current.visible = true;
        }
      }
      return;
    }

    // ── warp (synth transits only) ──
    const elapsed = state.phaseElapsed;
    const intensity = THREE.MathUtils.smoothstep(
      Math.min(
        clamp01(elapsed / WARP_RAMP_IN_SECONDS),
        clamp01((state.warpSeconds - elapsed) / WARP_RAMP_OUT_SECONDS),
      ),
      0,
      1,
    );
    warpIntensity.current = intensity;
    state.starDim = clamp01(
      (state.warpSeconds - elapsed) / STAR_RETURN_SECONDS,
    );

    // Gentle sway + roll inside the rig so the ride breathes without
    // moving the streak field itself
    sway
      .set(Math.sin(t * 0.9) * 0.5, Math.sin(t * 1.31) * 0.35, 0)
      .applyQuaternion(warpQuat.current);
    camera.position.copy(warpPos.current).add(sway);
    rollQuat.setFromAxisAngle(Z_AXIS, Math.sin(t * 0.7) * 0.035);
    camera.quaternion.copy(warpQuat.current).multiply(rollQuat);

    if (elapsed >= state.warpSeconds) {
      // Drop out of lightspeed onto the destination's approach line
      // (hopping routes if the destination lives elsewhere; the 808
      // transit already navigated at boarding); ending the journey hands
      // the camera back to CameraRig, whose resume swoop glides it the
      // rest of the way onto the perch
      viewGoal(rideDestView, t, camera, size, goalPos, goalLook);
      forward.copy(goalLook).sub(goalPos).normalize();
      camera.position
        .copy(goalPos)
        .addScaledVector(
          forward,
          rideDestView === "synth"
            ? -SYNTH_REENTRY_DISTANCE
            : -REENTRY_DISTANCE,
        );
      lookMatrix.lookAt(camera.position, goalLook, UP);
      camera.quaternion.setFromRotationMatrix(lookMatrix);
      if (rig.current) rig.current.visible = false;
      startCaptured.current = false;
      flashWarp();
      if (view !== rideDestView) {
        navigate(rideDestView === "synth" ? "/synth" : "/home");
      }
      endRocketJourney();
    }
  });

  return (
    <group ref={rig} visible={false}>
      {/* The warp zone brings its own light (the scene's ambient is
          starlight-dim); parented here, it only exists while the rig is
          visible */}
      <ambientLight intensity={0.55} />
      <pointLight position={[6, 14, 18]} intensity={2.2} decay={0} />
      <WarpStreaks getIntensity={() => warpIntensity.current} />
    </group>
  );
}
