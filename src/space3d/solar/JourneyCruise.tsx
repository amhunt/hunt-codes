import React, { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import WarpStreaks from "./WarpStreaks";
import { journeyState } from "../../rocketJourney";
import { cruiseState } from "../../journeyCruise";

/**
 * The /journey flight: while the crawl page is up, the camera cruises
 * through open space — parked far from both solar systems, drifting
 * through the shared streak field (WarpStreaks) at an easy burn. The
 * crawl's scroll velocity feeds cruiseState.boost, so scrubbing the
 * story hard kicks the ship toward lightspeed and eases back to a
 * drift when the visitor lets go.
 *
 * While mounted this component owns the camera (CameraRig stands down,
 * same dance as the lightspeed rides): on mount it eases from wherever
 * the camera was into the cruise pose; on unmount CameraRig's handoff
 * swoop glides back to the destination view.
 */

/** Far from the home system (origin) and the synth system (far below) */
const CRUISE_POS = new THREE.Vector3(0, 30, 700);
/** Flight heading: out into empty space, away from every body */
const CRUISE_DIR = new THREE.Vector3(0.2, 0.06, 1).normalize();
const ENTRY_SECONDS = 1.6;
/** Idle drift vs full-burn streak intensity */
const BASE_INTENSITY = 0.28;
const BOOST_INTENSITY = 0.65;
/** Cruise streaks amble slower than the rides' warp sprint */
const CRUISE_SPEED_SCALE = 0.45;
/** Background point stars dim a touch so the crawl + streaks read */
const STAR_DIM_CRUISE = 0.3;

const UP = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);

const easeInOutCubic = (x: number) =>
  x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;

// scratch values, reused every frame
const lookTarget = new THREE.Vector3();
const lookMatrix = new THREE.Matrix4();
const cruiseQuat = new THREE.Quaternion();
const sway = new THREE.Vector3();
const swayedPos = new THREE.Vector3();
const rollQuat = new THREE.Quaternion();
const targetQuat = new THREE.Quaternion();

export default function JourneyCruise() {
  const rig = useRef<THREE.Group>(null);
  const fromPos = useRef(new THREE.Vector3());
  const fromQuat = useRef(new THREE.Quaternion());
  const captured = useRef(false);
  const entry = useRef(0);
  const intensity = useRef(0);

  // The cruise borrows the rides' star dim; hand it back on unmount
  useEffect(
    () => () => {
      journeyState.starDim = 0;
    },
    [],
  );

  useFrame(({ camera, clock }, rawDelta) => {
    // Clamped like the rides: a backgrounded tab pauses, not skips
    const delta = Math.min(rawDelta, 0.1);
    const t = clock.elapsedTime;

    if (!captured.current) {
      captured.current = true;
      fromPos.current.copy(camera.position);
      fromQuat.current.copy(camera.quaternion);
      lookTarget.copy(CRUISE_POS).add(CRUISE_DIR);
      lookMatrix.lookAt(CRUISE_POS, lookTarget, UP);
      cruiseQuat.setFromRotationMatrix(lookMatrix);
      if (rig.current) {
        rig.current.position.copy(CRUISE_POS);
        rig.current.quaternion.copy(cruiseQuat);
      }
    }

    entry.current = Math.min(1, entry.current + delta / ENTRY_SECONDS);
    const e = easeInOutCubic(entry.current);

    // Gentle sway + roll around the parked pose so the flight breathes
    // (the same feel as the rides' warp; the streak field stays put)
    sway
      .set(Math.sin(t * 0.8) * 0.5, Math.sin(t * 1.17) * 0.35, 0)
      .applyQuaternion(cruiseQuat);
    swayedPos.copy(CRUISE_POS).add(sway);
    rollQuat.setFromAxisAngle(Z_AXIS, Math.sin(t * 0.6) * 0.03);
    targetQuat.copy(cruiseQuat).multiply(rollQuat);

    camera.position.lerpVectors(fromPos.current, swayedPos, e);
    camera.quaternion.slerpQuaternions(fromQuat.current, targetQuat, e);

    // Throttle: idle drift plus however hard the crawl is being scrubbed
    const target = Math.min(
      1,
      BASE_INTENSITY + cruiseState.boost * BOOST_INTENSITY,
    );
    intensity.current +=
      (target * e - intensity.current) * Math.min(1, delta * 3);

    journeyState.starDim = STAR_DIM_CRUISE * e;
  });

  return (
    <group ref={rig}>
      <WarpStreaks
        getIntensity={() => intensity.current}
        speedScale={CRUISE_SPEED_SCALE}
      />
    </group>
  );
}
