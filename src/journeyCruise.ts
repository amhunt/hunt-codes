/**
 * Shared state for the /journey cruise: the crawl page (DOM) writes how
 * hard the visitor is pushing the scroll and where the crawl currently
 * sits, and the 3D cruise (space3d/solar/JourneyCruise) reads both —
 * scrub fast and the ship burns harder; the flyby cameos are glued to
 * the crawl's progress, so they pass by exactly as the story does.
 * Plain mutable module, same pattern as solarHover / rocketJourney, so
 * main-chunk pages can import it without dragging three.js out of its
 * lazy chunk.
 */
export const cruiseState = {
  /** -1..1 — signed flight throttle from crawl scroll velocity (decays
   *  back to 0 in the crawl's frame loop): magnitude revs the streaks,
   *  sign steers them — scrub the story backwards and the ship flies
   *  backwards too */
  boost: 0,
  /** Crawl position in px (0 = story start), written every crawl frame */
  progressPx: 0,
  /** Full crawl length in px; 0 until the crawl page has measured itself
   *  (the cameos hide while it's 0 — no crawl, no story to fly past) */
  totalPx: 0,
};
