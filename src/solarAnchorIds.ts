/**
 * DOM ids for the overlay elements BodyAnchors glues to projected 3D
 * bodies each frame. Lives in its own three-free module so main-chunk
 * components (SolarOverlays, ZipVideoMoon) can import the ids without
 * dragging three.js out of its lazy chunk.
 */
export const EARTH_ABOUT_RING_ID = "earth-about-ring";
/** Group inside the /about ring holding Earth's hover-outline paths;
 *  Planet writes Earth's projected silhouette into every path under it. */
export const EARTH_ABOUT_OUTLINE_ID = "earth-about-outline";
/** The moon's video-link overlay on /about (rendered by Resume) and the
 *  group holding its hover-outline paths (written by Moon). */
export const MOON_VIDEO_LINK_ID = "moon-video-link";
export const MOON_VIDEO_OUTLINE_ID = "moon-video-outline";
/** The "andrewhunt" name SVG at the top of every page past the landing
 *  (AppBackground); at night the star field lays its glyph stars out over
 *  this element's box (NameStars in space3d/StarField). */
export const NAME_TITLE_ID = "name-title";
export const asteroidAnchorId = (name: string) => `asteroid-link-${name}`;
/** Group inside the anchor holding the hover-outline paths; Asteroid
 *  writes the projected silhouette into every path under it. */
export const asteroidOutlineId = (name: string) => `asteroid-outline-${name}`;
/** The satellite's part links on /projects-and-toys — the antenna cone
 *  (Zip blog post), the head's video screen (Zip launch reel), the
 *  graffiti heart (SVG Studio) and the cargo crate (/shop). ProjectsAndToys
 *  renders the overlays; Satellite writes their positions and outlines. */
export const SATELLITE_PARTS = ["antenna", "screen", "heart", "crate"] as const;
export type SatellitePart = (typeof SATELLITE_PARTS)[number];
export const satellitePartAnchorId = (part: SatellitePart) =>
  `satellite-part-${part}`;
export const satellitePartOutlineId = (part: SatellitePart) =>
  `satellite-part-outline-${part}`;
