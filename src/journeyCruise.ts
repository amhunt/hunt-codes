/**
 * Shared state for the /journey cruise: the crawl page (DOM) writes how
 * hard the visitor is pushing the scroll, and the 3D cruise
 * (space3d/solar/JourneyCruise) eases the warp-streak intensity toward
 * it — scrub fast and the ship burns harder. Plain mutable module, same
 * pattern as solarHover / rocketJourney, so main-chunk pages can import
 * it without dragging three.js out of its lazy chunk.
 */
export const cruiseState = {
  /** 0..1 — extra flight intensity from crawl scroll velocity (decays
   *  back to 0 in the crawl's frame loop) */
  boost: 0,
};
