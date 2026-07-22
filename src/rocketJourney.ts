/**
 * State machine for the lightspeed journeys: the rocket joyride (the
 * "So u wanna be astronaut?" easter egg on /home) and the 808-pad
 * transit to the synth solar system (/synth) and back. The DOM overlays
 * set journeys off; the 3D scene reads and advances the state per frame
 * (space3d/solar/RocketJourney). Lives in its own three-free module,
 * same as solarHover, so main-chunk components can import it without
 * dragging three.js out of its lazy chunk.
 *
 * Phases: "boarding" flies the camera toward the vehicle (or just turns
 * it toward home, for the return trip) while the windshield frame fades
 * in; a flash covers the jump to the warp zone ("warp"), where the star
 * streaks — and, on the joyride, the flyby cameos — play; a second
 * flash covers the drop onto the destination's approach line, after
 * which the journey is over ("idle") and CameraRig's ordinary swoop
 * glides the last stretch onto the perch.
 */
import { hoverState } from "./solarHover";

export type JourneyPhase = "idle" | "boarding" | "warp";
export type JourneyDestination = "home" | "synth";
/** What the boarding beat aims at: the rocket's nose, the 808 pad, or
 *  nothing (the synth return just turns the camera toward home). */
export type JourneyVehicle = "rocket" | "pad" | "none";

/** The full joyride (rocket): board, long warp with cameos, land home */
const BOARDING_SECONDS = 1.8;
const WARP_SECONDS = 11.4;
/** The synth transit (808 pad, both directions): quick, streaks only —
 *  it's navigation the visitor takes twice a session, not the joyride
 *  show. The warp still fits its full 0.9s stretch-in + 1s collapse-out
 *  envelope (RocketJourney) with a short cruise between. */
const TRANSIT_BOARD_SECONDS = 1;
const RETURN_TURN_SECONDS = 1;
const TRANSIT_WARP_SECONDS = 2.6;

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
  // ── per-journey plan, set by the start functions ──
  destination: "home" as JourneyDestination,
  vehicle: "rocket" as JourneyVehicle,
  boardSeconds: BOARDING_SECONDS,
  warpSeconds: WARP_SECONDS,
  /** Flyby cameos only play on the joyride, not the synth transits */
  cameos: true,
};

/** The `body` class that hides the page UI and reveals the windshield
 *  overlay while the journey plays (same pattern as `video-mode`). */
const JOURNEY_BODY_CLASS = "rocket-journey";

function beginJourney(
  vehicle: JourneyVehicle,
  destination: JourneyDestination,
  boardSeconds: number,
  warpSeconds: number,
  cameos: boolean,
): void {
  if (journeyState.phase !== "idle" || !journeyState.driverAlive) return;
  journeyState.vehicle = vehicle;
  journeyState.destination = destination;
  journeyState.boardSeconds = boardSeconds;
  journeyState.warpSeconds = warpSeconds;
  journeyState.cameos = cameos;
  journeyState.phase = "boarding";
  journeyState.phaseElapsed = 0;
  // The pointer is parked on the clicked overlay while it boards; the
  // overlay goes pointer-events:none without a reliable pointerleave, so
  // drop the hover freeze/whitewash here
  hoverState.asteroid = null;
  document.body.classList.add(JOURNEY_BODY_CLASS);
}

/** The rocket joyride: there and back again, all on /home. */
export const startRocketJourney = (): void =>
  beginJourney("rocket", "home", BOARDING_SECONDS, WARP_SECONDS, true);

/** The 808 pad: warp from /home to the synth solar system (/synth). */
export const startSynthJourney = (): void =>
  beginJourney(
    "pad",
    "synth",
    TRANSIT_BOARD_SECONDS,
    TRANSIT_WARP_SECONDS,
    false,
  );

/** Back to Earth from the synth system (/synth -> /home). */
export const startSynthReturn = (): void =>
  beginJourney(
    "none",
    "home",
    RETURN_TURN_SECONDS,
    TRANSIT_WARP_SECONDS,
    false,
  );

/** Ends the ride (natural landing or an abort — route change, scene
 *  unmount) and restores the page UI. Safe to call when already idle. */
export function endRocketJourney(): void {
  journeyState.phase = "idle";
  journeyState.phaseElapsed = 0;
  journeyState.starDim = 0;
  document.body.classList.remove(JOURNEY_BODY_CLASS);
}

/** One-shot white flash covering the warp entry/exit teleports (the
 *  element lives in the page's RocketCockpit overlay). */
export function flashWarp(): void {
  const el = document.getElementById("warp-flash");
  if (!el) return;
  el.classList.remove("is-flashing");
  // Force a reflow so re-adding the class restarts the animation
  void el.offsetWidth;
  el.classList.add("is-flashing");
}
