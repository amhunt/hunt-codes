import type { confetti } from "@tsparticles/confetti";

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
 */

/** How long each click keeps the cannon firing */
const VOLLEY_MS = 500;
const PARTICLES_PER_FRAME = 3;
/** Racing green (the day-mode name), cream, and the hover lavender */
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
/** Particle size multiplier (the docs' custom-shape examples run at 2) */
const SCALAR = 2;
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
  const settle = () => {
    volleysInFlight--;
    if (volleysInFlight === 0) teardownWhenDrained();
  };
  const options = {
    particleCount: PARTICLES_PER_FRAME,
    angle: 120,
    spread: 55,
    origin,
    colors: COLORS,
    shapes: ["image"],
    shapeOptions: { image: SIGNATURE },
    scalar: SCALAR,
    zIndex: Z_INDEX,
  };
  void (async () => {
    try {
      const { confetti } = await loadCelebration();
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
