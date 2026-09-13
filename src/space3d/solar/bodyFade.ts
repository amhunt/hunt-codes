import { useCallback, useRef } from "react";
import * as THREE from "three";

/** Shared 3s-in/1s-out reveal for bodies hidden on the landing view. */
const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;

/** Hide fully transparent groups instead of drawing them. */
const VISIBLE_EPSILON = 0.005;

export function useBodyFade(initiallyVisible: boolean) {
  const opacity = useRef(initiallyVisible ? 1 : 0);
  // Force callers to initialize material opacity on the first frame.
  const applied = useRef(-1);

  /**
   * Advances opacity and visibility. Returns true when callers need to update
   * materials, including on the first frame.
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
