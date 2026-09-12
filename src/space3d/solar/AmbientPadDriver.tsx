import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";

import { padPing, setPadBrightness, setPadScene } from "../../ambientPad";
import { PLANETS, planetPosition } from "./constants";
import type { SolarView } from "./CameraRig";
import { wireState } from "./wireSkin";

/**
 * The scene half of the generative background pad (ambientPad.ts, which
 * knows only about sound): hands it the view's chord, how close the
 * camera is to the sun, and a ping whenever two planets cross.
 *
 * Mounted once in SolarScene, like WireDriver, and renders nothing.
 */

/** Camera distance from the sun, in world units, mapped onto the pad's
 *  0..1 brightness. The landing camera sits at 35 and the close perches
 *  come inside 20, so this spans the scene's actual range. */
const NEAR_DISTANCE = 12;
const FAR_DISTANCE = 60;
/** Mesh view's glassier read, as a nudge on the same dial */
const MESH_BRIGHTNESS_BONUS = 0.12;

/** How close in heliocentric angle two planets must come to count as
 *  crossing — about 3°, which they pass through in a second or two. */
const CONJUNCTION_RADIANS = 0.05;
/** Conjunctions take minutes; checking every frame is wasted work. */
const CHECK_INTERVAL_SECONDS = 0.2;

const PAIRS: [number, number][] = PLANETS.flatMap((_, i) =>
  PLANETS.slice(i + 1).map((__, j): [number, number] => [i, i + 1 + j]),
);

/** Shortest angle between two headings, 0..π */
function angleGap(a: number, b: number): number {
  const raw = Math.abs(a - b) % (Math.PI * 2);
  return raw > Math.PI ? Math.PI * 2 - raw : raw;
}

const AmbientPadDriver = ({ view }: { view: SolarView }) => {
  useEffect(() => setPadScene(view), [view]);

  /** Last sampled gap per pair, to catch the frame it closes rather than
   *  re-firing for every frame it stays closed */
  const gaps = useRef<number[]>(PAIRS.map(() => Math.PI));
  const nextCheck = useRef(0);
  const angles = useRef(PLANETS.map(() => 0));
  const scratch = useRef(PLANETS.map(() => planetPosition(PLANETS[0], 0)));

  useFrame(({ clock, camera }) => {
    const t = clock.elapsedTime;

    const distance = camera.position.length();
    const span = FAR_DISTANCE - NEAR_DISTANCE;
    const near = 1 - (distance - NEAR_DISTANCE) / span;
    setPadBrightness(near + wireState.amount * MESH_BRIGHTNESS_BONUS);

    if (t < nextCheck.current) return;
    nextCheck.current = t + CHECK_INTERVAL_SECONDS;

    PLANETS.forEach((planet, i) => {
      const p = planetPosition(planet, t, scratch.current[i]);
      angles.current[i] = Math.atan2(p.z, p.x);
    });
    PAIRS.forEach(([a, b], pair) => {
      const gap = angleGap(angles.current[a], angles.current[b]);
      const was = gaps.current[pair];
      gaps.current[pair] = gap;
      // Falling edge only: fire as the two close, not for every sample
      // they spend inside the window
      if (was >= CONJUNCTION_RADIANS && gap < CONJUNCTION_RADIANS) {
        padPing(pair);
      }
    });
  });

  return null;
};

export default AmbientPadDriver;
