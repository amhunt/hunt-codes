/**
 * Scroll-scrubbed landing→home camera transition. The landing page has no
 * scrollable content, so Landing accumulates wheel/touch deltas into a
 * virtual `target` progress (0 = landing pose, 1 = home pose); CameraRig
 * eases `progress` toward it each frame and poses the camera between the
 * two view goals — so stopping mid-scroll parks the camera mid-swoop, and
 * scrolling back retreats. Landing navigates to /home when the target
 * reaches 1 and zeroes both fields on unmount.
 *
 * Lives in its own three-free module (like solarHover) so the main-chunk
 * Landing page can import it without dragging three.js out of its lazy
 * chunk.
 */
export const scrollTransitionState = {
  /** Wheel/touch-accumulated goal, 0..1 (written by Landing) */
  target: 0,
  /** Frame-eased progress the camera actually renders (owned by CameraRig) */
  progress: 0,
};
