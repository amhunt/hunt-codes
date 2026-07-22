import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

/**
 * The lightspeed streak field: one LineSegments whose head vertices
 * march toward the local origin (the camera's seat) and wrap; line
 * length and material opacity ride the intensity, so the field
 * stretches out of nothing as intensity rises and collapses back to
 * nothing as it falls.
 *
 * Extracted from RocketJourney so every space flight shares one
 * implementation: the joyride and 808 transits drive it with their warp
 * envelope, the /journey cruise idles it low and revs it with the
 * crawl's scroll. Parent it under a rig positioned/oriented at the
 * camera's flight pose; streaks live in rig-local space with -z ahead.
 */

const STREAK_COUNT = 340;
/** Streak heads live at rig-local z in [-DEPTH+PAD, PAD); -z is ahead */
const STREAK_DEPTH = 320;
const STREAK_BEHIND_PAD = 20;
const STREAK_RADIUS_MIN = 1.5;
const STREAK_RADIUS_MAX = 60;
const STREAK_SPEED = 300;
const STREAK_LENGTH = 30;

export default function WarpStreaks({
  getIntensity,
  speedScale = 1,
}: {
  /** Read per frame (a ref accessor, not React state): 0 = no streaks,
   *  1 = full lightspeed */
  getIntensity: () => number;
  /** Scales the march speed and stretch — the cruise ambles, the warp
   *  sprints */
  speedScale?: number;
}) {
  const lines = useRef<THREE.LineSegments>(null);

  // Per-streak cylindrical spots + speeds, plus the two-vertex-per-streak
  // line buffers (head bright, tail dim)
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

  useFrame((_, rawDelta) => {
    // Clamped like the rides' fades: a backgrounded tab must pause the
    // flight, not fast-forward it on the first frame back
    const delta = Math.min(rawDelta, 0.1);
    const intensity = THREE.MathUtils.clamp(getIntensity(), 0, 1);

    // March the streak heads toward the camera and wrap; tails trail
    // "ahead" (where the streak came from) by the stretched length
    const positions = streaks.positionAttr.array as Float32Array;
    const length = STREAK_LENGTH * speedScale * intensity + 0.2;
    for (let i = 0; i < STREAK_COUNT; i++) {
      let zHead =
        streaks.z[i] + streaks.speed[i] * speedScale * intensity * delta;
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
  });

  return (
    <lineSegments
      ref={lines}
      geometry={streaks.geometry}
      material={streaks.material}
      frustumCulled={false}
    />
  );
}
