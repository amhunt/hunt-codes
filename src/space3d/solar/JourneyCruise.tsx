import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import WarpStreaks from "./WarpStreaks";
import { viewGoal } from "./CameraRig";
import { ARTIFACT_BUILDERS, disposeArtifact } from "./warpArtifacts";
import {
  endRocketJourney,
  flashWarp,
  journeyState,
  startJourneyCruise,
} from "../../rocketJourney";
import { cruiseState } from "../../journeyCruise";

/**
 * The /journey flight: the rocket ride's destination and the story
 * crawl's stage. While the crawl page is up, the camera is parked far
 * from both solar systems, flying through the shared streak field
 * (WarpStreaks) from inside the cockpit (RocketCockpit's windshield,
 * revealed by body.rocket-journey). This component starts the ride
 * state itself on its first frame, so a deep link or the résumé link
 * gets the cockpit too — not just the rocket easter egg.
 *
 * The crawl's scroll velocity feeds cruiseState.boost (scrub the story
 * hard and the ship kicks toward lightspeed), and the crawl's PROGRESS
 * drives the flyby cameos: each artifact owns its own stretch of the
 * story, so they pass exactly as the text does — park the crawl and the
 * cameo parks, scroll back and it rewinds. (Eventually these become
 * objects matched to the chapters they fly past.)
 *
 * While mounted this component owns the camera (CameraRig stands down,
 * same dance as the synth transits): arriving out of the rocket's
 * boarding flash it snaps straight to the cruise pose (RocketJourney
 * already teleported the camera there under the flash); on a plain
 * navigation it eases in from wherever the camera was. The cockpit's
 * "End trip" button raises journeyState.landingRequested; the landing
 * plays the rides' re-entry beat — flash, drop onto home's approach
 * line, route change — and CameraRig's resume swoop glides the last
 * stretch onto the perch.
 */

/** Far from the home system (origin) and the synth system (far below) */
export const CRUISE_POS = new THREE.Vector3(0, 30, 700);
/** Flight heading: out into empty space, away from every body */
const CRUISE_DIR = new THREE.Vector3(0.2, 0.06, 1).normalize();
const ENTRY_SECONDS = 1.6;
/** Idle drift vs full-burn streak intensity */
const BASE_INTENSITY = 0.28;
const BOOST_INTENSITY = 0.65;
/** Cruise streaks amble slower than the synth transits' warp sprint */
const CRUISE_SPEED_SCALE = 0.45;
/** Background point stars dim a touch so the crawl + streaks read */
const STAR_DIM_CRUISE = 0.3;

/** How far out on home's approach line the landing drops the camera
 *  (same spot the old timed joyride landed on) */
const REENTRY_DISTANCE = 130;

/** Flyby cameo flight path, in rig-local units (-z is ahead) */
const ARTIFACT_Z_START = -170;
const ARTIFACT_Z_EXIT = 25;
/** Each cameo owns 1/Nth of the crawl (its "slot"); it waits LEAD of the
 *  slot, then crosses the windshield over SPAN of it — so the cameos
 *  tile the story one at a time, with every pass finished by the end. */
const ARTIFACT_LEAD = 0.05;
const ARTIFACT_SPAN = 0.9;

/** Lateral flyby heights, hand-varied so consecutive cameos don't trace
 *  the same line across the window */
const ARTIFACT_HEIGHTS = [-2, 3, -3.5, 2, 4.5, -2.5, 3.5, -3];
/** Slot 3 is the Babu Bélo — it flies oversized (and pirouettes, below) */
const ARTIFACT_SCALES = [4.5, 3.8, 3.6, 5.6, 3.6, 3.8, 3.8, 3.2];
/** Per-slot spin overrides (rad/s) on top of the default slow tumble */
const ARTIFACT_SPINS: Record<number, number> = { 3: 2.6 };

const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

/** The parked flight orientation, derived once from the heading */
export const CRUISE_QUAT = new THREE.Quaternion().setFromRotationMatrix(
  new THREE.Matrix4().lookAt(
    CRUISE_POS,
    CRUISE_POS.clone().add(CRUISE_DIR),
    UP,
  ),
);

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

// scratch values, reused every frame
const sway = new THREE.Vector3();
const swayedPos = new THREE.Vector3();
const rollQuat = new THREE.Quaternion();
const targetQuat = new THREE.Quaternion();
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const forward = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();

interface FlybyArtifact {
  group: THREE.Group;
  /** Which 1/Nth of the crawl this cameo rides */
  slot: number;
  /** -1 flies past on the left, +1 on the right */
  side: number;
  y: number;
  baseYaw: number;
  tilt: number;
  spin: number;
}

export default function JourneyCruise({
  navigate,
}: {
  /** Router navigation, threaded in from outside the canvas — the
   *  landing hops back to /home */
  navigate: (to: string) => void;
}) {
  const rig = useRef<THREE.Group>(null);
  const fromPos = useRef(new THREE.Vector3());
  const fromQuat = useRef(new THREE.Quaternion());
  const captured = useRef(false);
  const entry = useRef(0);
  const intensity = useRef(0);
  /** Signed streak direction, eased toward the scrub's sign: +1 cruising
   *  forward, -1 while the story is being rewound */
  const flow = useRef(1);
  /** Latched by the landing so the frames before unmount stay put */
  const landed = useRef(false);

  const artifacts: FlybyArtifact[] = useMemo(
    () =>
      ARTIFACT_BUILDERS.map((build, i) => {
        const group = build();
        group.scale.setScalar(ARTIFACT_SCALES[i]);
        group.visible = false;
        return {
          group,
          slot: i,
          side: i % 2 === 0 ? -1 : 1,
          y: ARTIFACT_HEIGHTS[i],
          baseYaw: (i * Math.PI) / 3,
          tilt: (i % 2 === 0 ? 1 : -1) * (0.15 + (i % 3) * 0.12),
          spin: ARTIFACT_SPINS[i] ?? 0.6 + (i % 3) * 0.35,
        };
      }),
    [],
  );
  useEffect(
    () => () => artifacts.forEach((a) => disposeArtifact(a.group)),
    [artifacts],
  );

  // Leaving /journey any way but the landing (browser back, credits
  // links) must still restore the page UI and star brightness
  useEffect(() => () => endRocketJourney(), []);

  useFrame(({ camera, clock, size }, rawDelta) => {
    if (landed.current) return;
    // Clamped like the rides: a backgrounded tab pauses, not skips
    const delta = Math.min(rawDelta, 0.1);
    const t = clock.elapsedTime;

    if (!captured.current) {
      captured.current = true;
      // A rocket arrival lands mid-warp: the boarding flash already
      // covered the teleport to the cruise pose, so skip the entry ease.
      // (Checked before startJourneyCruise, which flips idle → warp.)
      if (journeyState.phase === "warp") entry.current = 1;
      startJourneyCruise();
      fromPos.current.copy(camera.position);
      fromQuat.current.copy(camera.quaternion);
      if (rig.current) {
        rig.current.position.copy(CRUISE_POS);
        rig.current.quaternion.copy(CRUISE_QUAT);
      }
    }

    // "End trip": drop out of lightspeed onto home's approach line —
    // the same re-entry beat as the synth transits. Ending the journey
    // hands the camera to CameraRig, whose resume swoop after the route
    // change glides the last stretch onto the perch.
    if (journeyState.landingRequested) {
      landed.current = true;
      viewGoal("home", t, camera, size, goalPos, goalLook);
      forward.copy(goalLook).sub(goalPos).normalize();
      camera.position.copy(goalPos).addScaledVector(forward, -REENTRY_DISTANCE);
      lookMatrix.lookAt(camera.position, goalLook, UP);
      camera.quaternion.setFromRotationMatrix(lookMatrix);
      if (rig.current) rig.current.visible = false;
      flashWarp();
      navigate("/home");
      endRocketJourney();
      return;
    }

    entry.current = Math.min(1, entry.current + delta / ENTRY_SECONDS);
    const e = easeInOutCubic(entry.current);

    // Gentle sway + roll around the parked pose so the flight breathes
    // (the same feel as the rides' warp; the streak field stays put)
    sway
      .set(Math.sin(t * 0.8) * 0.5, Math.sin(t * 1.17) * 0.35, 0)
      .applyQuaternion(CRUISE_QUAT);
    swayedPos.copy(CRUISE_POS).add(sway);
    rollQuat.setFromAxisAngle(Z_AXIS, Math.sin(t * 0.6) * 0.03);
    targetQuat.copy(CRUISE_QUAT).multiply(rollQuat);

    camera.position.lerpVectors(fromPos.current, swayedPos, e);
    camera.quaternion.slerpQuaternions(fromQuat.current, targetQuat, e);

    // Throttle: idle drift plus however hard the crawl is being scrubbed
    // (boost is signed — magnitude revs the burn, sign steers the flow:
    // scrub the story backwards and the star field streams backwards)
    const target = Math.min(
      1,
      BASE_INTENSITY + Math.abs(cruiseState.boost) * BOOST_INTENSITY,
    );
    intensity.current +=
      (target * e - intensity.current) * Math.min(1, delta * 3);
    const flowTarget = cruiseState.boost < 0 ? -1 : 1;
    flow.current += (flowTarget - flow.current) * Math.min(1, delta * 3);

    // Chase the cruise's star dim rather than assigning it: a rocket
    // arrival comes in fully dimmed (boarding drove starDim to 1) and
    // the points ease back in instead of popping
    journeyState.starDim +=
      (STAR_DIM_CRUISE * e - journeyState.starDim) * Math.min(1, delta * 2);

    // Flyby cameos, glued to the crawl: p is this artifact's own 0..1
    // pass through the windshield, derived purely from crawl progress
    const slotPx =
      artifacts.length > 0 ? cruiseState.totalPx / artifacts.length : 0;
    for (const artifact of artifacts) {
      const p =
        slotPx > 0
          ? (cruiseState.progressPx -
              (artifact.slot + ARTIFACT_LEAD) * slotPx) /
            (slotPx * ARTIFACT_SPAN)
          : -1;
      if (p < 0 || p > 1) {
        artifact.group.visible = false;
        continue;
      }
      artifact.group.visible = true;
      const z = ARTIFACT_Z_START + p * (ARTIFACT_Z_EXIT - ARTIFACT_Z_START);
      // Drifts outward as it nears, exiting past the windshield's shoulder
      artifact.group.position.set(artifact.side * (9 + p * 14), artifact.y, z);
      // The tumble stays on the clock — a parked cameo still feels alive
      artifact.group.rotation.set(
        artifact.tilt,
        artifact.baseYaw + t * artifact.spin,
        0,
      );
    }
  });

  return (
    <group ref={rig}>
      {/* The cruise brings its own light for the cameos (the scene's
          ambient is starlight-dim); parented here, it lives only while
          the cruise does */}
      <ambientLight intensity={0.55} />
      <pointLight position={[6, 14, 18]} intensity={2.2} decay={0} />
      <WarpStreaks
        getIntensity={() => intensity.current}
        getFlow={() => flow.current}
        speedScale={CRUISE_SPEED_SCALE}
      />
      {artifacts.map((artifact, i) => (
        <primitive key={i} object={artifact.group} />
      ))}
    </group>
  );
}
