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
/** The moon's video-link overlay on /about and /home (rendered by Resume
 *  and Home) and the group holding its hover-outline paths (written by
 *  Moon). Only one route mounts at a time, so the id stays unique. */
export const MOON_VIDEO_LINK_ID = "moon-video-link";
export const MOON_VIDEO_OUTLINE_ID = "moon-video-outline";
export const asteroidAnchorId = (name: string) => `asteroid-link-${name}`;
/** Group inside the anchor holding the hover-outline paths; Asteroid
 *  writes the projected silhouette into every path under it. */
export const asteroidOutlineId = (name: string) => `asteroid-outline-${name}`;
