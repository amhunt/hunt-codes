import * as THREE from "three";

import type { PlanetKind } from "../../landingScene";
import type { SatellitePart } from "../../solarAnchorIds";
import type { AsteroidLogo } from "../textures";

/**
 * The 3D solar system, ported from the hunt-codes-3 prototype. World
 * units are hunt-codes-3's: sun radius 3, planets orbiting in the XZ
 * plane, camera hovering at y=58 for the top-down landing view. The
 * flat SVG solar system (landingScene.ts) remains the no-WebGL fallback
 * and keeps its own, unrelated viewBox units.
 */

export interface SolarPlanetConfig {
  name: string;
  kind: PlanetKind;
  radius: number;
  orbitRadius: number;
  /** radians per second */
  orbitSpeed: number;
  /** starting angle, radians */
  orbitPhase: number;
  /** radians per second of self-rotation */
  spinSpeed: number;
  /** Vertical (world-Y) offset from the orbital plane, world units.
   *  Planets sit at y=0; asteroids float a bit higher (near the sun's
   *  top) so they don't read as level with the sun's equator. */
  yOffset?: number;
  /** Brand badge decal projected onto both sides of the body (asteroids
   *  with a logo also spin upright-only so the mark stays readable) */
  logo?: AsteroidLogo;
  /** Placement overrides applied while layoutState.compact (phone-width
   *  viewports): the home view's link bodies pull inward so nothing
   *  clips the narrow frame. */
  compact?: Partial<
    Pick<SolarPlanetConfig, "orbitRadius" | "orbitPhase" | "yOffset">
  >;
}

/**
 * Whether the phone-width placement overrides apply. Written by
 * SolarScene from the canvas size (same 768px line as useWindowSize's
 * "sm"); read by planetPosition every frame — a plain mutable module,
 * like solarHover, so the frame loops stay React-free.
 */
export const layoutState = { compact: false };

export const SUN_RADIUS = 3;

/**
 * The sun's current rendered scale multiplier (it grows a bit for the
 * home view). Written by Sun each frame; read by SunSvgAnchor so the DOM
 * rings track the rendered size, not just the base radius.
 */
export const sunState = { scale: 1 };

/**
 * Whether the camera has finished its swoop to the current view. Written
 * by CameraRig each frame; overlays that should only appear once the
 * camera settles (the Earth "About Me" ring) read it.
 */
export const rigState = { settled: true };

/**
 * Global tempo for the whole system: every orbit and self-spin below —
 * planets, asteroids, the moon (and therefore the /about camera, which
 * rides the moon's orbit) — scales together, preserving the relative
 * motion that keeps the co-rotating asteroids frozen on screen.
 */
const SPEED_SCALE = 0.5;

const EARTH_ORBIT_SPEED = 0.09 * SPEED_SCALE;
export const PLANETS: SolarPlanetConfig[] = [
  {
    name: "Mercury",
    kind: "mercury",
    radius: 0.55,
    orbitRadius: 7.5,
    orbitSpeed: EARTH_ORBIT_SPEED,
    orbitPhase: 0.6,
    spinSpeed: 0.12 * SPEED_SCALE,
  },
  {
    name: "Venus",
    kind: "venus",
    radius: 1.05,
    orbitRadius: 12,
    orbitSpeed: 0.14 * SPEED_SCALE,
    orbitPhase: 2.4,
    spinSpeed: -0.05 * SPEED_SCALE,
  },
  {
    name: "Earth",
    kind: "earth",
    radius: 1.6,
    orbitRadius: 17.5,
    orbitSpeed: EARTH_ORBIT_SPEED,
    orbitPhase: 4.2,
    spinSpeed: 0.03 * SPEED_SCALE,
  },
  {
    name: "Mars",
    kind: "mars",
    radius: 0.85,
    orbitRadius: 23.5,
    orbitSpeed: 0.065 * SPEED_SCALE,
    orbitPhase: 1.3,
    spinSpeed: 0.3 * SPEED_SCALE,
  },
];

export const EARTH = PLANETS.find((p) => p.name === "Earth")!;

/**
 * Link asteroids: small rocks that float near the sun in the home view.
 * They orbit at exactly Earth's angular speed — the home camera co-rotates
 * with Earth, so matching it freezes them in place on screen, keeping
 * both links visible at fixed spots.
 *
 * They float `ASTEROID_Y` above the orbital plane so they line up roughly
 * with the top of the sun rather than its equator.
 */
const ASTEROID_Y = SUN_RADIUS;
export const ASTEROIDS: SolarPlanetConfig[] = [
  {
    // The link rocks (blog, LinkedIn — both parked) cluster in a shallow
    // arc low on the left. Placements below are solved against the home
    // camera's projection, so each lands on a chosen screen spot.
    // Parked, not rendered: the blog post it linked moved to /about's
    // work-sample cards (SolarScene skips it; SolarOverlays has no link)
    name: "recent",
    kind: "mercury",
    radius: 0.28,
    orbitRadius: 3.36,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 0.845,
    spinSpeed: 0.2 * SPEED_SCALE,
    yOffset: 2.1,
    logo: "blog",
    compact: {
      orbitRadius: 4.5,
      orbitPhase: EARTH.orbitPhase + 0.14,
      yOffset: ASTEROID_Y - 0.6,
    },
  },
  {
    // Rendered as the Sputnik satellite (Satellite.tsx): the door to
    // /projects-and-toys, where the camera closes in and its parts (the
    // antenna cone, a screen, a graffiti heart, a cargo crate) become the
    // links. On lg+ it floats in the gap between the home info panel and
    // Earth, just above the panel's top edge: the panel is a fixed-size
    // DOM box while the bodies' screen offsets scale with the viewport
    // height, and this spot (head at ~(715, 236) on a 1440x815 frame,
    // same camera distance as before) stays clear of it from 1280x800 up
    // through 2560x1440. Lower and further left it slid under the typed
    // greeting, whose box swallowed the link's clicks.
    name: "satellite",
    kind: "mercury",
    radius: 0.44,
    orbitRadius: 3.92,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 0.2,
    spinSpeed: -0.25 * SPEED_SCALE,
    yOffset: 4.11,
    compact: {
      orbitRadius: 4.5,
      orbitPhase: EARTH.orbitPhase + 0.01,
      yOffset: ASTEROID_Y - 0.15,
    },
  },
  {
    name: "linkedin",
    kind: "mercury",
    radius: 0.22,
    orbitRadius: 2.76,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 1.319,
    spinSpeed: 0.3 * SPEED_SCALE,
    logo: "linkedin",
    yOffset: 2.82,
    compact: {
      orbitRadius: 4.5,
      orbitPhase: EARTH.orbitPhase - 0.12,
      yOffset: ASTEROID_Y - 0.6,
    },
  },
  {
    // Rendered as the cartoon rocket (Rocket.tsx). Not a link: clicking
    // it launches the lightspeed joyride (rocketJourney.ts). Sits below
    // and right of Earth on wide screens; pulls inward and higher on
    // smaller ones so it stays in frame.
    name: "rocket",
    kind: "mercury",
    radius: 0.42,
    orbitRadius: 6.42,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase + 0.563,
    spinSpeed: 0.2 * SPEED_SCALE,
    yOffset: 1.36,
    compact: {
      orbitRadius: 5.6,
      orbitPhase: EARTH.orbitPhase + 0.29,
      yOffset: ASTEROID_Y - 1.1,
    },
  },
  {
    // Rendered as the floating 808 drum pad (DrumPad.tsx). Clicking it
    // warps to the synth solar system (/synth). Rides low between the
    // sun and Earth on wide screens. Hidden entirely on phone-width
    // screens (SolarScene + SolarOverlays).
    name: "synthpad",
    kind: "mercury",
    radius: 0.4,
    orbitRadius: 5.31,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase + 0.4,
    spinSpeed: 0.2 * SPEED_SCALE,
    yOffset: 0.54,
    // Tablet widths (compact layout, pad still shown): slide left so it
    // doesn't eclipse the LinkedIn rock, which shares its base bearing
    compact: {
      orbitRadius: 4.2,
      orbitPhase: EARTH.orbitPhase - 0.36,
      yOffset: ASTEROID_Y - 0.5,
    },
  },
];

export const ROCKET = ASTEROIDS.find((a) => a.name === "rocket")!;
export const SYNTH_PAD = ASTEROIDS.find((a) => a.name === "synthpad")!;
export const SATELLITE = ASTEROIDS.find((a) => a.name === "satellite")!;

/** Satellite proportions, as multiples of its config radius: the polished
 *  head sphere and the length of each antenna leg (Satellite.tsx builds
 *  the meshes from these; the part-link overlays are sized from them). */
export const SATELLITE_BODY_RADIUS_RATIO = 0.8;
export const SATELLITE_LEG_LENGTH_RATIO = 2.6;
/** Radians each antenna leg splays off the cone axis */
export const SATELLITE_LEG_TILT = 0.32;

/**
 * World-space centers of the satellite's link parts on /projects-and-toys
 * (solarAnchorIds SATELLITE_PARTS), written by Satellite each frame and
 * read by BodyAnchors to glue the DOM overlays: the parts hang off the
 * satellite's per-frame rig orientation, which nothing else can
 * recompute. `radius` is each part's rough world extent, for sizing its
 * overlay. A plain mutable module, like sunState.
 */
const satelliteBodyRadius = SATELLITE.radius * SATELLITE_BODY_RADIUS_RATIO;
export const satellitePartState: Record<
  SatellitePart,
  { position: THREE.Vector3; radius: number }
> = {
  // The cone's tips run off-screen in the close-up, so its hit circle
  // sits mid-cone (Satellite's ANTENNA_ANCHOR_ALONG) and covers the
  // visible stretch of the legs
  antenna: {
    position: new THREE.Vector3(),
    radius: SATELLITE.radius * SATELLITE_LEG_LENGTH_RATIO * 0.3,
  },
  screen: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.27 },
  heart: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.22 },
  crate: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.24 },
};

const WORLD_UP = new THREE.Vector3(0, 1, 0);
const legsEarth = new THREE.Vector3();
const legsSide = new THREE.Vector3();
/** How far the satellite's leg cone swings off dead-away-from-camera in
 *  the home view: enough right (+side) and down (-y) drift that the
 *  trailing legs still read as a cone instead of hiding edge-on behind
 *  the sphere. */
const LEGS_SIDE_DRIFT = 0.35;
const LEGS_DOWN_DRIFT = 0.05;

/**
 * Where the satellite's antenna cone points at elapsed time t: mostly
 * AWAY from the home camera in its co-rotating frame (the home camera
 * looks along the sun→Earth axis, so "away" is the Earth direction),
 * drifted right + down. The home camera co-rotates with Earth's orbit,
 * so this heading is fixed on screen there. Shared by Satellite (which
 * aims the cone) and CameraRig (which centers the /projects-and-toys
 * close-up on the whole body, cone included).
 */
export function satelliteLegsDirection(
  t: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  planetPosition(EARTH, t, legsEarth);
  legsEarth.normalize(); // ≈ camera forward on the home perch
  legsSide.copy(legsEarth).cross(WORLD_UP).normalize(); // screen-right
  return out
    .copy(legsEarth)
    .addScaledVector(legsSide, LEGS_SIDE_DRIFT)
    .addScaledVector(WORLD_UP, -LEGS_DOWN_DRIFT)
    .normalize();
}

// ── The /projects-and-toys close-up perch ──────────────────────────────
// The camera sits close enough that the head looms nearly the full
// height of a landscape frame — cut off by the bottom and left edges —
// with the antenna cone laid out flat to screen-right, running off the
// edge with its tips out of frame. The pose is built from that layout:
// a no-roll camera whose forward is perpendicular to the cone's heading
// (so the legs stay in the screen plane, pointing right), pitched
// PERCH_PITCH down onto the head, and TRANSLATED (not yawed) until the
// head projects at the requested spot — yawing a steeply pitched camera
// rolls its screen-up, which would tilt the whole layout. The sun and
// Earth both fall outside the frame from here; the stars carry the
// background. Portrait frames back off so the head fits the width.
const PERCH_RADII = 2;
const PERCH_RADII_PORTRAIT = 1.7;
/** Down-tilt onto the head, radians: enough that the beacon on top of
 *  the head is in view without looking straight down at it */
const PERCH_PITCH = 0.45;
/** Where the head's center lands (NDC) on a landscape frame: well left
 *  of center so the cone has the width to sweep across, and low so the
 *  head crowds the bottom edge while its top clears the name title.
 *  Narrow frames slide it back to the horizontal center. */
const PERCH_HEAD_NDC_X = -0.5;
const PERCH_HEAD_NDC_Y = -0.35;
const PERCH_LANDSCAPE_ASPECT = 1.6;
const PERCH_PORTRAIT_ASPECT = 0.9;

const perchHeading = new THREE.Vector3();
const perchForward = new THREE.Vector3();
const perchRight = new THREE.Vector3();
const perchUp = new THREE.Vector3();
const perchToBody = new THREE.Vector3();

/**
 * The /projects-and-toys camera pose at elapsed time t for a satellite at
 * `satellitePos` and a camera of the given vertical fov (degrees) and
 * aspect: the perch position and its look target. CameraRig swoops to
 * it; Satellite derives its link parts' layout from the same pose (their
 * frame faces this perch, with its screen-up), so the parts land where
 * the layout says by construction.
 */
export function satellitePerchPose(
  t: number,
  satellitePos: THREE.Vector3,
  fovDeg: number,
  aspect: number,
  outPos: THREE.Vector3,
  outLook: THREE.Vector3,
): void {
  // Horizontal heading of the antenna cone → the camera's screen-right
  satelliteLegsDirection(t, perchHeading);
  perchHeading.y = 0;
  perchHeading.normalize();
  // A no-roll camera whose right is that heading looks along UP × heading
  // (its forward × UP gives the heading back), pitched down
  perchForward
    .crossVectors(WORLD_UP, perchHeading)
    .multiplyScalar(Math.cos(PERCH_PITCH))
    .addScaledVector(WORLD_UP, -Math.sin(PERCH_PITCH));
  perchRight.crossVectors(perchForward, WORLD_UP).normalize();
  perchUp.crossVectors(perchRight, perchForward);
  // Slide the camera so the head projects at the requested NDC spot: a
  // body along forward + x·tan(fovH/2)·right + y·tan(fovV/2)·up lands at
  // NDC (x, y) exactly, so put the satellite that way from the camera
  const tanHalfV = Math.tan((fovDeg * Math.PI) / 360);
  const wide = THREE.MathUtils.clamp(
    (aspect - PERCH_PORTRAIT_ASPECT) /
      (PERCH_LANDSCAPE_ASPECT - PERCH_PORTRAIT_ASPECT),
    0,
    1,
  );
  perchToBody
    .copy(perchForward)
    .addScaledVector(perchRight, PERCH_HEAD_NDC_X * wide * tanHalfV * aspect)
    .addScaledVector(perchUp, PERCH_HEAD_NDC_Y * tanHalfV)
    .normalize();
  const distance =
    SATELLITE.radius * Math.max(PERCH_RADII, PERCH_RADII_PORTRAIT / aspect);
  outPos.copy(satellitePos).addScaledVector(perchToBody, -distance);
  outLook.copy(outPos).add(perchForward);
}

/** Earth's moon — orbits Earth (not the sun), in the same XZ plane. */
export const MOON = {
  radius: 0.42,
  /** orbit radius around Earth's center */
  orbitRadius: 4,
  /** radians per second — slow, so the /about camera drifts gently */
  orbitSpeed: 0.18 * SPEED_SCALE,
  orbitPhase: 1.1,
  spinSpeed: 0.05 * SPEED_SCALE,
};

/** Position of a planet at elapsed time t (seconds), honoring the
 *  phone-width overrides while layoutState.compact. */
export function planetPosition(
  p: SolarPlanetConfig,
  t: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  const c = layoutState.compact ? p.compact : undefined;
  const angle = (c?.orbitPhase ?? p.orbitPhase) + t * p.orbitSpeed;
  const orbitRadius = c?.orbitRadius ?? p.orbitRadius;
  return out.set(
    Math.cos(angle) * orbitRadius,
    c?.yOffset ?? p.yOffset ?? 0,
    Math.sin(angle) * orbitRadius,
  );
}

const moonEarthScratch = new THREE.Vector3();

/** World position of the moon at elapsed time t = Earth's position + its
 *  own orbit around Earth. */
export function moonPosition(
  t: number,
  out = new THREE.Vector3(),
): THREE.Vector3 {
  planetPosition(EARTH, t, moonEarthScratch);
  const a = MOON.orbitPhase + t * MOON.orbitSpeed;
  return out.set(
    moonEarthScratch.x + Math.cos(a) * MOON.orbitRadius,
    0,
    moonEarthScratch.z + Math.sin(a) * MOON.orbitRadius,
  );
}
