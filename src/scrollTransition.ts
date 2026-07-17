/**
 * Scroll-scrubbed camera journey across the site's three views:
 * landing (0) → home (1) → about (2). The pages have no scrollable
 * content (the /about résumé being the exception — it keeps native
 * scroll and no journey handlers), so useScrollJourney accumulates
 * wheel/touch deltas into the `target` stop value; CameraRig eases
 * `progress` toward it each frame and poses the camera along the
 * between-view swoops. Stopping mid-scroll parks the camera mid-swoop;
 * scrolling back retreats. When the RENDERED progress reaches a
 * different stop, the hook commits the matching route — and CameraRig
 * recognizes the scroll-committed arrival and skips its timed swoop
 * (restarting it was the "full re-animation" bug).
 *
 * Lives in its own three-free module (like solarHover) so main-chunk
 * pages can import it without dragging three.js out of its lazy chunk.
 */
export const scrollTransitionState = {
  /** Wheel/touch-accumulated goal, in stop units 0..2 (useScrollJourney) */
  target: 0,
  /** Frame-eased progress the camera actually renders (owned by CameraRig) */
  progress: 0,
  /** True once CameraRig has adopted the mounted view as the journey
   *  position — route commits must wait for it (a fresh page load starts
   *  with stale zeros here while the three.js chunk loads) */
  initialized: false,
  /** Mirror of the rig's timed-transition settled state: scroll input is
   *  ignored while a link-triggered swoop owns the camera */
  rigSettled: false,
};

/** Journey stop for each solar view / route */
export const JOURNEY_STOPS = { landing: 0, home: 1, about: 2 } as const;
