import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, ROCKET, SYNTH_PAD } from "./constants";
import { rocketNoseDirection } from "./Rocket";
import { viewGoal, type SolarView } from "./CameraRig";
import { ARTIFACT_BUILDERS, disposeArtifact } from "./warpArtifacts";
import { endRocketJourney, flashWarp, journeyState } from "../../rocketJourney";
import { SYNTH_ORIGIN } from "../../synthSpec";

/**
 * Drives every lightspeed journey: the rocket joyride (the /home
 * "So u wanna be astronaut?" easter egg) and the 808-pad transits to
 * the synth solar system and back. While journeyState is active this
 * component owns the camera — CameraRig stands down — and plays three
 * beats:
 *
 * 1. Boarding: the camera swoops toward the journey's vehicle (behind
 *    the rocket's nose, or down over the 808 pad; the synth return just
 *    swings the nose around toward home) while the stars fade and the
 *    DOM windshield frame fades in (App.scss, `body.rocket-journey`).
 * 2. Warp: a flash covers a teleport to a "warp zone" hundreds of units
 *    along the travel heading — far enough that no solar system is more
 *    than a speck. The rig (this component's group) is parked there
 *    carrying the Star Wars streak field — plus the flyby artifact
 *    cameos on the joyride — and the camera sways gently inside it.
 * 3. Re-entry: a second flash covers a teleport onto the destination
 *    view's approach line (navigating to its route if needed), then the
 *    journey ends and CameraRig's ordinary resume swoop glides the last
 *    stretch onto the perch — the landing.
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

/** Joyride warp zone: this far from the origin along the rocket's nose */
const WARP_DISTANCE = 900;
/** Transit warp zone: this far past the boarding spot along the heading
 *  (roughly a quarter of the way to the other system) */
const TRANSIT_WARP_AHEAD = 450;
/** Intensity envelope: streaks stretch in/out over these ramps */
const WARP_RAMP_IN_SECONDS = 0.9;
const WARP_RAMP_OUT_SECONDS = 1;
/** Stars fade back in over the last stretch of warp (decelerating) */
const STAR_RETURN_SECONDS = 1.2;

const STREAK_COUNT = 340;
/** Streak heads live at rig-local z in [-DEPTH+PAD, PAD); -z is ahead */
const STREAK_DEPTH = 320;
const STREAK_BEHIND_PAD = 20;
const STREAK_RADIUS_MIN = 1.5;
const STREAK_RADIUS_MAX = 60;
const STREAK_SPEED = 300;
const STREAK_LENGTH = 30;

const ARTIFACT_Z_START = -170;
const ARTIFACT_Z_EXIT = 25;
const ARTIFACT_SPEED = 115;
const ARTIFACT_FIRST_SPAWN = 1;
const ARTIFACT_SPAWN_INTERVAL = 1.25;

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

interface FlybyArtifact {
  group: THREE.Group;
  spawnAt: number;
  /** -1 flies past on the left, +1 on the right */
  side: number;
  y: number;
  baseYaw: number;
  tilt: number;
  spin: number;
}

/** Lateral flyby heights, hand-varied so consecutive cameos don't trace
 *  the same line across the window */
const ARTIFACT_HEIGHTS = [-2, 3, -3.5, 2.5, 4.5, -2.5, 3.5, -3];
const ARTIFACT_SCALES = [4.5, 3.8, 3.6, 3.4, 3.6, 3.8, 3.8, 3.2];

export default function RocketJourney({
  view,
  navigate,
}: {
  view: SolarView;
  /** Router navigation, threaded in from outside the canvas (context
   *  doesn't cross the R3F reconciler boundary) — re-entry uses it when
   *  the destination lives on another route */
  navigate: (to: string) => void;
}) {
  const rig = useRef<THREE.Group>(null);
  const streakLines = useRef<THREE.LineSegments>(null);

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

  // Streak field: per-streak cylindrical spots + speeds, plus the
  // two-vertex-per-streak line buffers (head bright, tail dim)
  const streaks = useMemo(() => {
    const x = new Float32Array(STREAK_COUNT);
    const y = new Float32Array(STREAK_COUNT);
    const z = new Float32Array(STREAK_COUNT);
    const speed = new Float32Array(STREAK_COUNT);
    const colors = new Float32Array(STREAK_COUNT * 6);
    const tint = new THREE.Color();
    for (let i = 0; i < STREAK_COUNT; i++) {
      const angle = Math.random() * Math.PI * 2;
      // sqrt-distributed radius = uniform density over the disc
      const radius =
        STREAK_RADIUS_MIN +
        Math.sqrt(Math.random()) * (STREAK_RADIUS_MAX - STREAK_RADIUS_MIN);
      x[i] = Math.cos(angle) * radius;
      y[i] = Math.sin(angle) * radius;
      z[i] = -STREAK_DEPTH + Math.random() * (STREAK_DEPTH + STREAK_BEHIND_PAD);
      speed[i] = STREAK_SPEED * (0.7 + Math.random() * 0.6);
      const pick = Math.random();
      tint.set(pick < 0.7 ? "#ffffff" : pick < 0.85 ? "#ab8ffd" : "#9ecbff");
      colors[i * 6] = tint.r;
      colors[i * 6 + 1] = tint.g;
      colors[i * 6 + 2] = tint.b;
      colors[i * 6 + 3] = tint.r * 0.05;
      colors[i * 6 + 4] = tint.g * 0.05;
      colors[i * 6 + 5] = tint.b * 0.05;
    }
    const geometry = new THREE.BufferGeometry();
    const positionAttr = new THREE.BufferAttribute(
      new Float32Array(STREAK_COUNT * 6),
      3,
    );
    positionAttr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute("position", positionAttr);
    geometry.setAttribute("color", new THREE.BufferAttribute(colors, 3));
    const material = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    return { x, y, z, speed, geometry, positionAttr, material };
  }, []);
  useEffect(
    () => () => {
      streaks.geometry.dispose();
      streaks.material.dispose();
    },
    [streaks],
  );

  const artifacts: FlybyArtifact[] = useMemo(
    () =>
      ARTIFACT_BUILDERS.map((build, i) => {
        const group = build();
        group.scale.setScalar(ARTIFACT_SCALES[i]);
        group.visible = false;
        return {
          group,
          spawnAt: ARTIFACT_FIRST_SPAWN + i * ARTIFACT_SPAWN_INTERVAL,
          side: i % 2 === 0 ? -1 : 1,
          y: ARTIFACT_HEIGHTS[i],
          baseYaw: (i * Math.PI) / 3,
          tilt: (i % 2 === 0 ? 1 : -1) * (0.15 + (i % 3) * 0.12),
          spin: 0.6 + (i % 3) * 0.35,
        };
      }),
    [],
  );
  useEffect(
    () => () => artifacts.forEach((a) => disposeArtifact(a.group)),
    [artifacts],
  );

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
      return;
    }
    // Route change mid-ride (browser back): abort and let CameraRig
    // swoop to the new view from wherever the camera is. The journey's
    // own routes don't count: the origin view is where it boarded, and
    // the destination view arrives mid-ride by design (the 808 transit
    // flips the URL at boarding). Once the destination view has been
    // seen, leaving it again (back mid-warp) is a real abort.
    const rideDestView: SolarView =
      state.destination === "synth" ? "synth" : "home";
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

      const p = clamp01(state.phaseElapsed / state.boardSeconds);
      const e = easeInOutCubic(p);
      camera.position.lerpVectors(startPos.current, targetPos, e);
      camera.quaternion.slerpQuaternions(startQuat.current, targetQuat, e);
      // Stars fade with the approach; the flash + streaks take over
      state.starDim = e;

      if (p >= 1) {
        state.phase = "warp";
        state.phaseElapsed = 0;
        flashWarp();
        // Jump along the current heading: same orientation, new spot —
        // the flash covers the position cut, the view direction doesn't
        // change, and every solar system ends up a speck
        if (state.vehicle === "rocket") {
          warpPos.current.copy(travelDir).multiplyScalar(WARP_DISTANCE);
        } else {
          warpPos.current
            .copy(targetPos)
            .addScaledVector(travelDir, TRANSIT_WARP_AHEAD);
        }
        warpQuat.current.copy(targetQuat);
        camera.position.copy(warpPos.current);
        camera.quaternion.copy(warpQuat.current);
        if (rig.current) {
          rig.current.position.copy(warpPos.current);
          rig.current.quaternion.copy(warpQuat.current);
          rig.current.visible = true;
        }
        // A transit must not inherit a frozen cameo from an aborted joyride
        if (!state.cameos) {
          artifacts.forEach((artifact) => (artifact.group.visible = false));
        }
      }
      return;
    }

    // ── warp ──
    const elapsed = state.phaseElapsed;
    const intensity = THREE.MathUtils.smoothstep(
      Math.min(
        clamp01(elapsed / WARP_RAMP_IN_SECONDS),
        clamp01((state.warpSeconds - elapsed) / WARP_RAMP_OUT_SECONDS),
      ),
      0,
      1,
    );
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

    // March the streak heads toward the camera and wrap; tails trail
    // "ahead" (where the streak came from) by the stretched length
    const positions = streaks.positionAttr.array as Float32Array;
    const length = STREAK_LENGTH * intensity + 0.2;
    for (let i = 0; i < STREAK_COUNT; i++) {
      let zHead = streaks.z[i] + streaks.speed[i] * intensity * delta;
      if (zHead > STREAK_BEHIND_PAD) zHead -= STREAK_DEPTH + STREAK_BEHIND_PAD;
      streaks.z[i] = zHead;
      positions[i * 6] = streaks.x[i];
      positions[i * 6 + 1] = streaks.y[i];
      positions[i * 6 + 2] = zHead;
      positions[i * 6 + 3] = streaks.x[i];
      positions[i * 6 + 4] = streaks.y[i];
      positions[i * 6 + 5] = zHead - length;
    }
    streaks.positionAttr.needsUpdate = true;
    streaks.material.opacity = intensity;

    // Flyby cameos (joyride only): each pops in far ahead, drifts
    // outward as it nears, and exits past the shoulder of the windshield
    if (state.cameos) {
      for (const artifact of artifacts) {
        const local = elapsed - artifact.spawnAt;
        const z = ARTIFACT_Z_START + local * ARTIFACT_SPEED;
        if (local < 0 || z > ARTIFACT_Z_EXIT) {
          artifact.group.visible = false;
          continue;
        }
        artifact.group.visible = true;
        const progress =
          (z - ARTIFACT_Z_START) / (ARTIFACT_Z_EXIT - ARTIFACT_Z_START);
        artifact.group.position.set(
          artifact.side * (9 + progress * 14),
          artifact.y,
          z,
        );
        artifact.group.rotation.set(
          artifact.tilt,
          artifact.baseYaw + t * artifact.spin,
          0,
        );
      }
    }

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
      <lineSegments
        ref={streakLines}
        geometry={streaks.geometry}
        material={streaks.material}
        frustumCulled={false}
      />
      {artifacts.map((artifact, i) => (
        <primitive key={i} object={artifact.group} />
      ))}
    </group>
  );
}
