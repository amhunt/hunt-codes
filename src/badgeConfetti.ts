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
 * Warm the particle engine chunks on hover so the first click fires
 * without a beat of loading.
 */
export const preloadBadgeConfetti = () => {
  loadCelebration().catch(() => {});
};

/** @param origin Launch point in viewport fractions (0–1), the coin's center */
export const fireBadgeConfetti = (origin: { x: number; y: number }) => {
  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    return;
  }
  loadCelebration()
    .then(({ confetti }) => {
      const end = performance.now() + VOLLEY_MS;
      const frame = () => {
        void confetti(CANVAS_ID, {
          particleCount: PARTICLES_PER_FRAME,
          angle: 120,
          spread: 55,
          origin,
          colors: COLORS,
          shapes: ["image"],
          shapeOptions: { image: SIGNATURE },
          scalar: SCALAR,
          zIndex: Z_INDEX,
        });
        if (performance.now() < end) requestAnimationFrame(frame);
      };
      frame();
    })
    .catch(() => {
      // Decorative: a failed chunk load just means no confetti
    });
};
