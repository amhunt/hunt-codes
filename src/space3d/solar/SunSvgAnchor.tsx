import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  SOLAR_SYSTEM_SVG_ID,
  SUN_CENTER,
  SUN_CLOUD_ID,
  SUN_CORE_ID,
  SUN_SURFACE_RADIUS,
} from "../../landingScene";
import { SUN_RADIUS, sunState } from "./constants";
import { liveElementById } from "../svgTracking";

/**
 * Glues the landing "enter" ring SVG to the 3D sun — the inverse of the
 * old pixel-space scenes (which glued 3D bodies to the SVG). Every frame
 * the sun's world origin is projected through the perspective camera and
 * the SVG is positioned and scaled so its disc coincides with the
 * projected sun. During the camera swoop between views the ring
 * therefore tracks the sun continuously.
 *
 * The SVG's flat disc fill is blanked while this is live (the 3D sphere
 * replaces it) and restored if the scene goes away (unmount, WebGL
 * context loss) so the ring never renders hollow.
 */

interface AnchorConfig {
  id: string;
  viewBox: number;
  cx: number;
  cy: number;
  /** Disc radius in viewBox units — mapped onto the projected sun radius */
  discR: number;
  /** Extra ring size so the orbiting text clears the sun's bright limb */
  ringScale: number;
}

const LANDING_ANCHOR: AnchorConfig = {
  id: SOLAR_SYSTEM_SVG_ID,
  viewBox: 600,
  cx: SUN_CENTER,
  cy: SUN_CENTER,
  discR: SUN_SURFACE_RADIUS,
  ringScale: 1,
};

const projected = new THREE.Vector3();

const SunSvgAnchor = () => {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const adoptedRef = useRef<SVGSVGElement | null>(null);

  const helpers = useMemo(() => {
    const release = () => {
      const svg = adoptedRef.current;
      adoptedRef.current = null;
      if (!svg) return;
      [SUN_CORE_ID, SUN_CLOUD_ID].forEach((id) => {
        const el = svg.querySelector<SVGElement>(`#${id}`);
        if (el) el.style.fill = "";
      });
      [
        "position",
        "left",
        "top",
        "width",
        "height",
        "margin",
        "visibility",
      ].forEach((prop) => svg.style.removeProperty(prop));
    };

    const adopt = (svg: SVGSVGElement) => {
      release();
      adoptedRef.current = svg;
      [SUN_CORE_ID, SUN_CLOUD_ID].forEach((id) => {
        const el = svg.querySelector<SVGElement>(`#${id}`);
        if (el) el.style.fill = "transparent";
      });
    };

    return { release, adopt };
  }, []);

  // Restore the SVG on unmount and on WebGL context loss (the canvas
  // stops drawing while we stay mounted); the per-frame re-adopt picks
  // the svg back up once the context is restored.
  useEffect(() => helpers.release, [helpers]);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => helpers.release();
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, helpers]);

  useFrame(({ camera }) => {
    const config = LANDING_ANCHOR;
    const el = liveElementById(config.id) as SVGSVGElement | null;

    if (!el) {
      if (adoptedRef.current) helpers.release();
      return;
    }
    if (el !== adoptedRef.current) helpers.adopt(el);

    // Project the sun's center (world origin) to CSS pixels
    projected.set(0, 0, 0).project(camera);
    const sx = (projected.x * 0.5 + 0.5) * size.width;
    const sy = (0.5 - projected.y * 0.5) * size.height;

    // Apparent radius of the sun sphere at the camera's distance
    const persp = camera as THREE.PerspectiveCamera;
    const distance = persp.position.length();
    const projR =
      ((SUN_RADIUS * sunState.scale) /
        distance /
        Math.tan((persp.fov * Math.PI) / 360)) *
      (size.height / 2);

    const scale = (projR / config.discR) * config.ringScale;
    const sizePx = config.viewBox * scale;
    el.style.position = "fixed";
    el.style.margin = "0";
    el.style.left = `${sx - config.cx * scale}px`;
    el.style.top = `${sy - config.cy * scale}px`;
    el.style.width = `${sizePx}px`;
    el.style.height = `${sizePx}px`;
  });

  return null;
};

export default SunSvgAnchor;
