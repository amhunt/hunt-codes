/**
 * Hover flags for the planet-link overlays, bridged into the WebGL scene
 * (the DOM sets them; Sun/Planet read them per frame to ease their glow
 * up). Lives in its own three-free module so main-chunk components
 * (Landing, SolarOverlays) can import it without dragging three.js out
 * of its lazy chunk.
 */
export const hoverState = { sun: false, earth: false };
