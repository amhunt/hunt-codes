import * as THREE from "three";

import { SUN_WORLD_RADIUS, type PlanetKind } from "../../landingScene";
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
  /** Radians per second of self-rotation, positive being prograde — the
   *  same sense the body orbits in. `Planet.tsx` negates it on the way
   *  into `rotation.y`, whose +Y turns against the orbits' -Y; the
   *  asteroids only tumble for looks, so `Asteroid.tsx` spins on the raw
   *  sign. */
  spinSpeed: number;
  /** Axial tilt (obliquity) off the orbital plane, radians: the body spins
   *  about this tilted pole instead of straight-up world Y. Venus's ~177°
   *  is what makes its spin read retrograde, so its spinSpeed stays
   *  positive, as the real one's does. */
  axialTilt?: number;
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

export const SUN_RADIUS = SUN_WORLD_RADIUS;

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

/** Earth's orbit and body radius: the anchors the other three planets are
 *  derived from below, so the system stays proportional to the real one. */
const EARTH_ORBIT_RADIUS = 17.5;
const EARTH_ORBIT_SPEED = 0.09 * SPEED_SCALE;
const EARTH_RADIUS = 1.6;

/**
 * An orbit radius paired with the angular speed Kepler's third law gives
 * it — T² ∝ a³, so ω ∝ a^-3/2 — anchored to Earth's. Spread into a
 * config (`...orbit(12)`) so a radius and its speed can't drift apart.
 *
 * The radii themselves stay compressed (Mars renders 1.34 Earth orbits
 * out, not 1.52), and deriving each speed from the radius the body
 * actually renders at is the point: the system is Keplerian for the
 * orbits you can see, which is what reads on screen. The periods land
 * within ~17% of the real ones as a bonus.
 */
const orbit = (orbitRadius: number) => ({
  orbitRadius,
  orbitSpeed: EARTH_ORBIT_SPEED * (orbitRadius / EARTH_ORBIT_RADIUS) ** -1.5,
});

/** Sized off Earth by the real equatorial radius ratio (km, from NASA's
 *  planetary fact sheets): the planets are true to each other even though
 *  the sun — radius 3, against the 175 it would need — and the orbit
 *  radii are not. */
const radiusVsEarth = (km: number) => EARTH_RADIUS * (km / 6371);

const tilt = (degrees: number) => THREE.MathUtils.degToRad(degrees);

export const PLANETS: SolarPlanetConfig[] = [
  {
    name: "Mercury",
    kind: "mercury",
    radius: radiusVsEarth(2439.7),
    ...orbit(7.5),
    orbitPhase: 0.6,
    spinSpeed: 0.12 * SPEED_SCALE,
    axialTilt: tilt(0.034),
  },
  {
    name: "Venus",
    kind: "venus",
    radius: radiusVsEarth(6051.8),
    ...orbit(12),
    orbitPhase: 2.4,
    // Prograde-positive like the rest: Venus turns backwards because it
    // is tipped almost fully over, and the 177° tilt below supplies that.
    spinSpeed: 0.05 * SPEED_SCALE,
    axialTilt: tilt(177.36),
  },
  {
    name: "Earth",
    kind: "earth",
    radius: EARTH_RADIUS,
    ...orbit(EARTH_ORBIT_RADIUS),
    orbitPhase: 4.2,
    spinSpeed: 0.039 * SPEED_SCALE,
    axialTilt: tilt(23.44),
  },
  {
    name: "Mars",
    kind: "mars",
    radius: radiusVsEarth(3389.5),
    ...orbit(23.5),
    orbitPhase: 1.3,
    spinSpeed: 0.3 * SPEED_SCALE,
    axialTilt: tilt(25.19),
  },
];

export const EARTH = PLANETS.find((p) => p.name === "Earth")!;
export const MARS = PLANETS.find((p) => p.name === "Mars")!;

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
    // The link trio (blog rock, Sputnik satellite, LinkedIn rock) once
    // clustered in a shallow arc low on the left; both rocks are parked
    // now and the satellite has moved right (see its entry). Placements
    // below are solved against the home camera's projection, so each
    // lands on a chosen screen spot.
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
    // screen, a floating pen, a vase, a scroll off its antenna tips)
    // become the links. On wide screens it floats low-center above the sun's limb:
    // right of the intro text (`.homeInfoContainer`, whose width grows
    // with the viewport — this spot clears it through 2560x1440) and
    // short of Earth's "ABOUT ME" ring, legs trailing toward Earth.
    name: "satellite",
    kind: "mercury",
    radius: 0.44,
    orbitRadius: 4,
    orbitSpeed: EARTH.orbitSpeed,
    orbitPhase: EARTH.orbitPhase - 0.15,
    spinSpeed: -0.25 * SPEED_SCALE,
    yOffset: 2.67,
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
];

export const ROCKET = ASTEROIDS.find((a) => a.name === "rocket")!;

/**
 * The floating 808 drum pad (DrumPad.tsx): the door to the synth solar
 * system (/synth). Not an orbiting body — it floats beside the satellite
 * in the /projects-and-toys close-up, placed from that view's camera
 * framing (DrumPad), so it carries no orbit. Hidden on phone widths
 * (SolarScene + ProjectsAndToys). `radius` scales its chassis and halo.
 */
export const SYNTH_PAD = { name: "synthpad", radius: 0.25 };

/**
 * World center of the 808 pad, written by DrumPad each frame and read by
 * BodyAnchors (its click overlay) and RocketJourney (the synth transit
 * boards over it): the pad hangs off the close-up camera framing, which
 * nothing else can recompute. A plain mutable module, like sunState.
 */
export const synthPadState = { position: new THREE.Vector3() };
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
  scroll: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.5 },
  screen: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.32 },
  pen: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.5 },
  vase: { position: new THREE.Vector3(), radius: satelliteBodyRadius * 0.3 },
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

const frameOutward = new THREE.Vector3();
/** How far the close-up perch swings from level-with-the-satellite toward
 *  straight above it (radially away from the sun): 0 leaves the sun
 *  under the bottom edge, more of it looks further down over the head,
 *  raising the sun's limb into the frame. Tuned to the satellite's home
 *  spot — it orbits well clear of the sun, so the perch climbs this much
 *  to bring ~7° of limb into the frame. */
const PERCH_CLIMB = 0.35;
/** Then swing the perch around the sun line, radians. 0 puts the sun
 *  dead below the satellite with its antenna cone climbing screen-right;
 *  this much slides the sun's limb to the bottom-left and levels the
 *  cone out to the right (a touch below level), leaving the bottom-right
 *  clear for the caption. */
const PERCH_AZIMUTH = 0.8;

/**
 * The /projects-and-toys viewing frame around the satellite. `outToward`
 * is the direction from the satellite to its close-up camera perch:
 * level with the satellite and perpendicular to the sun→satellite line,
 * on the upper side, tipped PERCH_CLIMB outward and swung PERCH_AZIMUTH
 * around the sun line. Looking back along it with world-up as the
 * camera's up keeps the sun below the frame, its limb glowing along the
 * bottom edge instead of filling the sky behind the satellite. `outUp` is
 * that pose's screen-up. CameraRig perches there; Satellite mounts its
 * link parts on the hemisphere facing it, so they face the camera by
 * construction.
 */
export function satelliteViewFrame(
  satellitePos: THREE.Vector3,
  outToward: THREE.Vector3,
  outUp: THREE.Vector3,
): void {
  frameOutward.copy(satellitePos).normalize(); // sun→satellite
  // World-up with the outward component removed: level with the
  // satellite, perpendicular to the sun line, on the upper side
  outToward
    .copy(WORLD_UP)
    .addScaledVector(frameOutward, -frameOutward.y)
    .normalize()
    .addScaledVector(frameOutward, PERCH_CLIMB)
    .normalize()
    .applyAxisAngle(frameOutward, PERCH_AZIMUTH);
  outUp.copy(WORLD_UP).addScaledVector(outToward, -outToward.y).normalize();
}

/** Earth's moon — orbits Earth (not the sun), in the same XZ plane. */
const MOON_ORBIT_SPEED = 0.18 * SPEED_SCALE;
const MOON_ORBIT_PHASE = 1.1;
export const MOON = {
  radius: 0.42,
  /** orbit radius around Earth's center */
  orbitRadius: 4,
  /** radians per second — slow, so the /about camera drifts gently */
  orbitSpeed: MOON_ORBIT_SPEED,
  orbitPhase: MOON_ORBIT_PHASE,
  /**
   * Tidally locked: exactly one prograde rotation per orbit, so the same
   * face holds toward Earth. Moon.tsx drives the rotation off the same
   * clock as the orbit rather than accumulating frame deltas, so the lock
   * can't drift out of true — and negates it like Planet.tsx does, since
   * prograde runs against a +Y `rotation.y` here.
   */
  spinSpeed: MOON_ORBIT_SPEED,
  /** The `rotation.y` that squares the near side onto Earth at t=0 (the
   *  lock above holds it there): the body's +X points at Earth when
   *  rotation.y = π − orbit angle. */
  spinPhase: Math.PI - MOON_ORBIT_PHASE,
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
