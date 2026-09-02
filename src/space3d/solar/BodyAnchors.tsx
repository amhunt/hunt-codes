import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  ASTEROIDS,
  EARTH,
  moonPosition,
  MOON,
  planetPosition,
  rigState,
  satellitePartState,
  type SolarPlanetConfig,
} from "./constants";
import { projectBody, type ProjectedBody } from "./projection";
import { liveElementById } from "../svgTracking";
import {
  asteroidAnchorId,
  EARTH_ABOUT_RING_ID,
  MOON_VIDEO_LINK_ID,
  SATELLITE_PARTS,
  satellitePartAnchorId,
  type SatellitePart,
} from "../../solarAnchorIds";

/**
 * Glues DOM overlay elements to projected 3D bodies (the inverse-gluing
 * pattern SunSvgAnchor established, generalized): every frame each
 * configured body is projected through the camera and its overlay —
 * looked up by id — is positioned and sized around it. Absent elements
 * are skipped, so route scoping comes for free: the overlays are
 * rendered by home-page components and simply don't exist elsewhere.
 *
 * Overlays should default to `visibility: hidden` in CSS; the anchor
 * reveals them once positioned (and hides them again while the body is
 * behind the camera mid-swoop).
 *
 * The overlay ids live in solarAnchorIds.ts (three-free) so main-chunk
 * components can import them without pulling three.js along.
 */

interface BodyAnchorConfig {
  domId: string;
  position: (t: number, out: THREE.Vector3) => THREE.Vector3;
  radius: number;
  /** Overlay diameter as a multiple of the body's projected diameter */
  ringScale: number;
  /** Floor on the overlay's CSS size, px (legibility / hit target) */
  minSizePx: number;
  /** Keep the overlay faded out until the camera swoop settles (the
   *  element's CSS supplies the opacity transition) */
  fadeInOnArrival?: boolean;
}

const asteroidConfig = (asteroid: SolarPlanetConfig): BodyAnchorConfig => ({
  domId: asteroidAnchorId(asteroid.name),
  position: (t, out) => planetPosition(asteroid, t, out),
  radius: asteroid.radius,
  ringScale: 1.4,
  minSizePx: 44,
});

/** The satellite's part links on /projects-and-toys: Satellite publishes
 *  each part's world center per frame (satellitePartState — the parts
 *  ride its rig orientation). Sized to the part: the head parts get a
 *  roomy circle, the antenna a tighter one so it stays clear of the head
 *  (the cone is long and thin; its hover outline shows the true shape). */
const satellitePartConfig = (part: SatellitePart): BodyAnchorConfig => ({
  domId: satellitePartAnchorId(part),
  position: (_t, out) => out.copy(satellitePartState[part].position),
  radius: satellitePartState[part].radius,
  ringScale: part === "antenna" ? 1.2 : 1.6,
  minSizePx: 44,
  fadeInOnArrival: true,
});

const ANCHORS: BodyAnchorConfig[] = [
  {
    domId: EARTH_ABOUT_RING_ID,
    position: (t, out) => planetPosition(EARTH, t, out),
    radius: EARTH.radius,
    // The text path sits at 82% of the overlay's radius, so 1.55 floats
    // the letters ~27% clear of Earth's limb (1.3 grazed the surface)
    ringScale: 1.55,
    minSizePx: 140,
    fadeInOnArrival: true,
  },
  {
    // The moon's video link (the overlay exists on /about)
    domId: MOON_VIDEO_LINK_ID,
    position: (t, out) => moonPosition(t, out),
    radius: MOON.radius,
    ringScale: 1.4,
    minSizePx: 44,
    fadeInOnArrival: true,
  },
  ...ASTEROIDS.map(asteroidConfig),
  ...SATELLITE_PARTS.map(satellitePartConfig),
];

const worldPos = new THREE.Vector3();
const projected: ProjectedBody = { x: 0, y: 0, projR: 0, inFront: false };

const BodyAnchors = () => {
  const size = useThree((s) => s.size);

  useFrame(({ camera, clock }) => {
    const persp = camera as THREE.PerspectiveCamera;
    // CameraRig moved the camera earlier this frame; refresh its inverse
    // matrix so projections don't lag a frame behind during swoops
    persp.updateMatrixWorld();
    const t = clock.elapsedTime;

    for (const anchor of ANCHORS) {
      const el = liveElementById(anchor.domId) as HTMLElement | null;
      if (!el) continue;

      anchor.position(t, worldPos);
      projectBody(persp, size, worldPos, anchor.radius, projected);

      if (!projected.inFront) {
        el.style.visibility = "hidden";
        continue;
      }
      const sizePx = Math.max(
        2 * projected.projR * anchor.ringScale,
        anchor.minSizePx,
      );
      el.style.position = "fixed";
      el.style.margin = "0";
      el.style.left = `${projected.x - sizePx / 2}px`;
      el.style.top = `${projected.y - sizePx / 2}px`;
      el.style.width = `${sizePx}px`;
      el.style.height = `${sizePx}px`;
      el.style.visibility = "visible";
      if (anchor.fadeInOnArrival) {
        // Opacity (not visibility) so the element's CSS transition fades
        // it in once the camera arrives
        el.style.opacity = rigState.settled ? "1" : "0";
        el.style.pointerEvents = rigState.settled ? "" : "none";
      }
    }
  });

  return null;
};

export default BodyAnchors;
