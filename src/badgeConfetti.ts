import type { confetti } from "@tsparticles/confetti";

import {
  BADGE_AIM_MS,
  BADGE_LAUNCH_ANGLE_DEG,
  badgeAimState,
} from "./badgeState";
import { loadCelebration } from "./celebration";

/**
 * The corner coin's click: a short cannon volley of the signature "A"
 * mark, fired from the coin up and across the page in the site's palette.
 *
 * Angle and physics are confetti.js.org's "School Pride" cannon (the
 * right-hand one: angle 120, spread 55, default velocity / gravity /
 * decay) minus its 15-second loop — a few frames of fire per click, so it
 * keeps the streaming-cannon look without running continuously. The
 * custom shape follows the docs' "Custom Shapes" recipe: an SVG image
 * with `replaceColor`, so each "A" takes a confetti color.
 *
 * A click first turns the coin's face onto that same heading
 * (badgeAimState → BadgeMedallion) and holds the volley for the swing,
 * so the "A"s look like they're coming off the face of the coin.
 */

/** How long each click keeps the cannon firing */
const VOLLEY_MS = 500;
const PARTICLES_PER_FRAME = 3;
/** Racing green (the wordmark's own green), cream, and the hover lavender */
const COLORS = ["#004225", "#f5ecd6", "#ab8ffd"];
/**
 * public/signature-a.svg — the favicon's "A" (also extruded onto the coin
 * face, see BadgeMedallion). tsParticles only fetches-and-recolors a
 * source whose URL ends in `.svg`, which rules out an inlined data URI.
 */
const SIGNATURE = {
  src: "/signature-a.svg",
  replaceColor: true,
  width: 174,
  height: 199,
};
/** Particle size multiplier (the docs' custom-shape examples run at 2;
 *  the mark runs 30% past that) */
const SCALAR = 2.6;
/**
 * How far, in CSS px along its heading, a piece travels per unit of
 * `startVelocity`, from tsParticles' confetti physics: the engine steps
 * position by velocity x (startVelocity x 3 x 1/2) each frame and decays
 * velocity by 0.9, so the run sums to 10 x 1.5 = 15 per unit. The launch
 * velocity is solved from this per click so the volley's median piece —
 * the one on the 120deg heading — ends up over the viewport's centre,
 * for a symmetrical fall off the screen from any corner.
 */
const REACH_PER_VELOCITY_PX = 15;
const MIN_START_VELOCITY = 30;
const MAX_START_VELOCITY = 140;
/**
 * A container of its own, rather than the default shared "confetti" one:
 * the fullscreen canvas's z-index is fixed when its container is created,
 * and /about destroys its rain container on unmount — which would cut a
 * volley short if the two shared it.
 */
const CANVAS_ID = "badge-confetti";
/** Over every fixed control (the coin link is 4000, the pills 5000) */
const Z_INDEX = 6000;
/**
 * Once the last volley has drained the container comes down: tsParticles
 * keeps a fullscreen, retina-scaled 2D canvas clearing at up to 120fps
 * for as long as a container lives, and this one would otherwise sit over
 * both WebGL canvases for the rest of the session. The library rebuilds a
 * destroyed container on the next call, so the next click just works.
 */
const DRAIN_POLL_MS = 400;
/** Particles live ~3.5s (200 ticks); stop waiting well past that */
const DRAIN_MAX_MS = 10_000;

type ConfettiContainer = NonNullable<Awaited<ReturnType<typeof confetti>>>;

const waitUntil = (time: number) =>
  new Promise((resolve) =>
    window.setTimeout(resolve, Math.max(0, time - performance.now())),
  );

const prefersReducedMotion = () =>
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

let container: ConfettiContainer | undefined;
let volleysInFlight = 0;
let drainTimer: number | undefined;

const teardownWhenDrained = () => {
  window.clearTimeout(drainTimer);
  const deadline = performance.now() + DRAIN_MAX_MS;
  const check = () => {
    const live = container;
    if (!live || live.destroyed) {
      container = undefined;
      return;
    }
    if (live.particles.count > 0 && performance.now() < deadline) {
      drainTimer = window.setTimeout(check, DRAIN_POLL_MS);
      return;
    }
    live.destroy();
    container = undefined;
  };
  drainTimer = window.setTimeout(check, DRAIN_POLL_MS);
};

/**
 * Warm the particle engine chunks (and the mark itself) on hover so the
 * first click fires without a beat of loading.
 */
export const preloadBadgeConfetti = () => {
  if (prefersReducedMotion()) return;
  loadCelebration().catch(() => {});
  void fetch(SIGNATURE.src).catch(() => {});
};

/** @param origin Launch point in viewport fractions (0–1), the coin's center */
export const fireBadgeConfetti = (origin: { x: number; y: number }) => {
  if (prefersReducedMotion()) return;
  // A click mid-drain keeps the container up for the new volley
  window.clearTimeout(drainTimer);
  volleysInFlight++;
  // The coin swings onto the launch heading while the (possibly cold)
  // engine chunks load, and holds it until the last volley has been fired
  badgeAimState.aiming = true;
  const settle = () => {
    volleysInFlight--;
    if (volleysInFlight > 0) return;
    badgeAimState.aiming = false;
    teardownWhenDrained();
  };
  // Aim the median piece at the centre of the viewport: its horizontal
  // reach is the run length times the heading's cosine, so solve the
  // run length for the coin's distance from centre
  const coinX = origin.x * (window.innerWidth || 1);
  const travelPx = coinX - (window.innerWidth || 1) / 2;
  const headingX = Math.abs(Math.cos((BADGE_LAUNCH_ANGLE_DEG * Math.PI) / 180));
  const startVelocity = Math.min(
    MAX_START_VELOCITY,
    Math.max(
      MIN_START_VELOCITY,
      travelPx / (REACH_PER_VELOCITY_PX * Math.max(headingX, 0.05)),
    ),
  );
  const options = {
    particleCount: PARTICLES_PER_FRAME,
    angle: BADGE_LAUNCH_ANGLE_DEG,
    spread: 55,
    startVelocity,
    origin,
    colors: COLORS,
    shapes: ["image"],
    shapeOptions: { image: SIGNATURE },
    scalar: SCALAR,
    zIndex: Z_INDEX,
  };
  void (async () => {
    const aimedAt = performance.now() + BADGE_AIM_MS;
    try {
      const { confetti } = await loadCelebration();
      // Nothing leaves the face until the coin has finished turning
      await waitUntil(aimedAt);
      // The first call builds the container (and, on the session's first
      // click, pulls in the engine's lazy chunks) — start the clock only
      // once it exists, or the whole volley queues up behind it and lands
      // as a single burst
      container = (await confetti(CANVAS_ID, options)) ?? container;
      const end = performance.now() + VOLLEY_MS;
      let failed = false;
      const frame = () => {
        if (failed || performance.now() >= end) {
          settle();
          return;
        }
        confetti(CANVAS_ID, options).catch(() => {
          failed = true;
        });
        requestAnimationFrame(frame);
      };
      requestAnimationFrame(frame);
    } catch {
      // Decorative: a failed chunk load just means no confetti
      settle();
    }
  })();
};
