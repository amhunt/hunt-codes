import { useCallback, useRef } from "react";
import * as THREE from "three";

/**
 * The landing→home reveal every body in the scene shares: bodies hidden in
 * the landing view fade up over the swoop to the home perch, and back out
 * on the way home. Three seconds in, one back out — leaving is quicker
 * than arriving, so the scene clears before the next view settles.
 */
const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;

/** Below this the group is hidden outright rather than drawn transparent */
const VISIBLE_EPSILON = 0.005;

export function useBodyFade(initiallyVisible: boolean) {
  /** The live 0..1 reveal. Readable every frame — the satellite hands it
   *  to its energy wave — and it advances whether or not anything is
   *  repainted. */
  const opacity = useRef(initiallyVisible ? 1 : 0);
  const applied = useRef(-1);

  /**
   * Step the ramp one frame and toggle the group's visibility. Returns
   * whether the value actually moved: three is happy to be handed the
   * same opacity every frame, but walking a body's material tree to do it
   * is the expensive half, so callers apply `opacity.current` to their own
   * materials only when this says so. (`applied` starts at -1, so the
   * first frame always counts as a change and initializes the group.)
   */
  const advance = useCallback(
    (group: THREE.Object3D, visible: boolean, delta: number) => {
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      if (opacity.current === applied.current) return false;
      applied.current = opacity.current;
      group.visible = opacity.current > VISIBLE_EPSILON;
      return true;
    },
    [],
  );

  return { opacity, advance };
}
