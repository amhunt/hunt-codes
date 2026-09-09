import { useEffect, useState } from "react";

import { scrollTransitionState } from "./scrollTransition";

/**
 * Whether the solar camera has finished its swoop into the current view
 * — for DOM pages that should wait for the scene to arrive before they
 * show themselves (the shop over its moon perch). Reads the rig's
 * `rigSettled` flag off scrollTransition (a three-free module, so this
 * stays out of the 3D chunk) on the frame clock rather than subscribing:
 * the rig writes it per frame from useFrame, and one React state hop is
 * all the DOM needs. It waits for two settled frames in a row: on a route
 * change the page can mount a frame ahead of the rig's first update,
 * while the flag still says the previous view had settled. Polling stops
 * once it reports true — the view doesn't change while the page is up.
 */
export default function useCameraSettled(): boolean {
  const [settled, setSettled] = useState(false);
  useEffect(() => {
    let frame = 0;
    let streak = 0;
    const poll = () => {
      streak = scrollTransitionState.rigSettled ? streak + 1 : 0;
      if (streak >= 2) {
        setSettled(true);
        return;
      }
      frame = requestAnimationFrame(poll);
    };
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, []);
  return settled;
}
