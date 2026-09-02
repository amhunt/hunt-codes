/**
 * The roving "andrewhunt" letter highlight — AppBackground's 200ms ticker
 * (or the synth's note events on /synth) — mirrored into a plain mutable
 * module so the WebGL name stars can read it every frame without the
 * ticker's React re-renders reaching the canvas (same pattern as
 * solarHover.ts / starPan.ts).
 */
export const nameHighlightState = {
  /** Index of the highlighted letter within "andrewhunt" */
  letter: 0,
};
