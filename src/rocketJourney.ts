/**
 * State machine for the lightspeed journeys: the rocket ride to the
 * /journey story crawl (the "So u wanna be astronaut?" easter egg on
 * /home) and the 808-pad transit to the synth solar system (/synth) and
 * back. The DOM overlays set journeys off; the 3D scene reads and
 * advances the state per frame (space3d/solar/RocketJourney plays the
 * boarding beats and the synth warps; space3d/solar/JourneyCruise owns
 * the rocket ride's open-ended warp on /journey). Lives in its own
 * three-free module, same as solarHover, so main-chunk components can
 * import it without dragging three.js out of its lazy chunk.
 *
 * Phases: "boarding" flies the camera toward the vehicle (or just turns
 * it toward home, for the return trip) while the windshield frame fades
 * in; a flash covers the jump to the warp zone ("warp"). The synth
 * transits' warp is timed — a second flash drops onto the destination's
 * approach line and the journey is over ("idle"). The rocket ride's warp
 * is the /journey cruise itself: it lasts as long as the visitor rides
 * the story crawl, until the cockpit's "End trip" button (or the crawl
 * page going away) lands it.
 */
import { hoverState } from "./solarHover";

export type JourneyPhase = "idle" | "boarding" | "warp";
export type JourneyDestination = "home" | "synth" | "journey";
/** What the boarding beat aims at: the rocket's nose, the 808 pad, or
 *  nothing (the synth return just turns the camera toward home; the
 *  /journey cruise starts mid-warp on a deep link). */
export type JourneyVehicle = "rocket" | "pad" | "none";

/** The rocket ride: board behind the nose, then warp into the crawl */
const BOARDING_SECONDS = 1.8;
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
  /** The cockpit's "End trip" button raises this; JourneyCruise's frame
   *  loop consumes it (flash, drop onto home's approach line, land). */
  landingRequested: false,
  // ── per-journey plan, set by the start functions ──
  destination: "home" as JourneyDestination,
  vehicle: "rocket" as JourneyVehicle,
  boardSeconds: BOARDING_SECONDS,
  /** Timed warps only (the synth transits); the rocket ride's warp is
   *  open-ended — the crawl decides when it's over */
  warpSeconds: TRANSIT_WARP_SECONDS,
};

/** The `body` class that hides the page UI and reveals the windshield
 *  overlay while the journey plays (same pattern as `video-mode`). */
const JOURNEY_BODY_CLASS = "rocket-journey";

function beginJourney(
  vehicle: JourneyVehicle,
  destination: JourneyDestination,
  boardSeconds: number,
  warpSeconds: number,
): void {
  if (journeyState.phase !== "idle" || !journeyState.driverAlive) return;
  journeyState.vehicle = vehicle;
  journeyState.destination = destination;
  journeyState.boardSeconds = boardSeconds;
  journeyState.warpSeconds = warpSeconds;
  journeyState.phase = "boarding";
  journeyState.phaseElapsed = 0;
  journeyState.landingRequested = false;
  // The pointer is parked on the clicked overlay while it boards; the
  // overlay goes pointer-events:none without a reliable pointerleave, so
  // drop the hover freeze/whitewash here
  hoverState.asteroid = null;
  document.body.classList.add(JOURNEY_BODY_CLASS);
}

/** The rocket ride: board on /home, then warp into the /journey story
 *  crawl (RocketJourney flips the route under the warp flash). */
export const startRocketJourney = (): void =>
  beginJourney("rocket", "journey", BOARDING_SECONDS, Infinity);

/** The 808 pad: warp from /home to the synth solar system (/synth). */
export const startSynthJourney = (): void =>
  beginJourney("pad", "synth", TRANSIT_BOARD_SECONDS, TRANSIT_WARP_SECONDS);

/** Back to Earth from the synth system (/synth -> /home). */
export const startSynthReturn = (): void =>
  beginJourney("none", "home", RETURN_TURN_SECONDS, TRANSIT_WARP_SECONDS);

/** The /journey cruise announcing itself (JourneyCruise's first frame):
 *  a deep link or resume-link arrival starts the ride mid-warp — cockpit
 *  up, no boarding beat. No-op when the rocket boarding already began
 *  the ride (or any other journey is playing). */
export function startJourneyCruise(): void {
  if (journeyState.phase !== "idle") return;
  journeyState.vehicle = "none";
  journeyState.destination = "journey";
  journeyState.boardSeconds = 0;
  journeyState.warpSeconds = Infinity;
  journeyState.phase = "warp";
  journeyState.phaseElapsed = 0;
  journeyState.landingRequested = false;
  document.body.classList.add(JOURNEY_BODY_CLASS);
}

/** The cockpit's "End trip" button: asks the cruise to drop out of
 *  lightspeed and land home. The 3D loop performs the landing (flash,
 *  approach line, route change) on its next frame. */
export function requestJourneyLanding(): void {
  if (journeyState.phase === "idle") return;
  journeyState.landingRequested = true;
}

/** Ends the ride (natural landing or an abort — route change, scene
 *  unmount) and restores the page UI. Safe to call when already idle. */
export function endRocketJourney(): void {
  journeyState.phase = "idle";
  journeyState.phaseElapsed = 0;
  journeyState.starDim = 0;
  journeyState.landingRequested = false;
  document.body.classList.remove(JOURNEY_BODY_CLASS);
}

/** One-shot white flash covering the warp entry/exit teleports (the
 *  element lives in the app-level RocketCockpit overlay). */
export function flashWarp(): void {
  const el = document.getElementById("warp-flash");
  if (!el) return;
  el.classList.remove("is-flashing");
  // Force a reflow so re-adding the class restarts the animation
  void el.offsetWidth;
  el.classList.add("is-flashing");
}
