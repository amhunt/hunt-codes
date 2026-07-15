/**
 * State machine for the rocket-ship joyride (the "surprise me" easter
 * egg on /home): boarding swoop -> lightspeed warp -> drop back home.
 * The DOM overlay sets it off (SolarOverlays' rocket button); the 3D
 * scene reads and advances it per frame (space3d/solar/RocketJourney).
 * Lives in its own three-free module, same as solarHover, so main-chunk
 * components can import it without dragging three.js out of its lazy
 * chunk.
 *
 * Phases: "boarding" flies the camera in behind the rocket while the
 * windshield frame fades in; a flash covers the jump to the warp zone
 * ("warp"), where the star streaks and flyby artifacts play; a second
 * flash covers the drop back onto the home approach line, after which
 * the journey is over ("idle") and CameraRig's ordinary swoop glides
 * the last stretch onto the perch — the "landing back home".
 */
import { hoverState } from "./solarHover";

export type JourneyPhase = "idle" | "boarding" | "warp";

export const BOARDING_SECONDS = 1.8;
export const WARP_SECONDS = 11.4;

export const journeyState = {
  phase: "idle" as JourneyPhase,
  /** Seconds into the current phase; advanced by RocketJourney's frame loop */
  phaseElapsed: 0,
  /** 0..1 — how much the star canvas fades out (the warp streaks take
   *  over from the point stars; StarField multiplies its opacity by
   *  1 - starDim) */
  starDim: 0,
  /** True while RocketJourney is mounted and driving frames. If the 3D
   *  background ever crashes (AppBackground's error boundary latches),
   *  the overlay button can outlive the scene — without a driver the
   *  ride must not start, or the hidden page UI would never come back. */
  driverAlive: false,
};

/** The `body` class that hides the page UI and reveals the windshield
 *  overlay while the journey plays (same pattern as `video-mode`). */
const JOURNEY_BODY_CLASS = "rocket-journey";

export function startRocketJourney(): void {
  if (journeyState.phase !== "idle" || !journeyState.driverAlive) return;
  journeyState.phase = "boarding";
  journeyState.phaseElapsed = 0;
  // The pointer is parked on the rocket's overlay while it boards; the
  // overlay goes pointer-events:none without a reliable pointerleave, so
  // drop the hover freeze/whitewash here
  hoverState.asteroid = null;
  document.body.classList.add(JOURNEY_BODY_CLASS);
}

/** Ends the ride (natural landing or an abort — route change, scene
 *  unmount) and restores the page UI. Safe to call when already idle. */
export function endRocketJourney(): void {
  journeyState.phase = "idle";
  journeyState.phaseElapsed = 0;
  journeyState.starDim = 0;
  document.body.classList.remove(JOURNEY_BODY_CLASS);
}

/** One-shot white flash covering the warp entry/exit teleports (the
 *  element lives in Home's RocketCockpit overlay). */
export function flashWarp(): void {
  const el = document.getElementById("warp-flash");
  if (!el) return;
  el.classList.remove("is-flashing");
  // Force a reflow so re-adding the class restarts the animation
  void el.offsetWidth;
  el.classList.add("is-flashing");
}
