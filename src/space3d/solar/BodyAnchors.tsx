import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  ASTEROIDS,
  EARTH,
  planetPosition,
  rigState,
  type SolarPlanetConfig,
} from "./constants";
import { projectBody, type ProjectedBody } from "./projection";
import { liveElementById } from "../svgTracking";

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
 */

export const EARTH_ABOUT_RING_ID = "earth-about-ring";
export const asteroidAnchorId = (name: string) => `asteroid-link-${name}`;

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
  minSizePx: 36,
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
  ...ASTEROIDS.map(asteroidConfig),
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
