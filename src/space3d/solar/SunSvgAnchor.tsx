import { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import {
  RENDERED_3D_FLAG,
  SOLAR_SYSTEM_SVG_ID,
  SUN_CENTER,
  SUN_CLOUD_ID,
  SUN_CORE_ID,
  SUN_SURFACE_RADIUS,
} from "../../landingScene";
import {
  HOME_SUN_CX,
  HOME_SUN_CY,
  HOME_SUN_RADIUS,
  HOME_SUN_SVG_ID,
} from "../../SunSvg";
import { SUN_RADIUS } from "./constants";
import { liveElementById } from "../svgTracking";

/**
 * Glues the DOM sun rings to the 3D sun — the inverse of the old
 * pixel-space scenes (which glued 3D bodies to the SVG). Every frame the
 * sun's world origin is projected through the perspective camera, and
 * whichever sun SVG is on screen (the landing "enter" ring or the home
 * orbiting-links ring) is positioned and scaled so its disc coincides
 * with the projected sun. During the camera swoop between views the ring
 * therefore tracks the sun continuously.
 *
 * Like the old scenes, the SVG's flat disc fill is blanked while this is
 * live (the 3D sphere replaces it) and restored whenever the scene goes
 * away, so the SVG remains the complete no-WebGL fallback. The flag also
 * lets CSS hide the SVG's fallback orbits/planets.
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

const HOME_ANCHOR: AnchorConfig = {
  id: HOME_SUN_SVG_ID,
  viewBox: 550,
  cx: HOME_SUN_CX,
  cy: HOME_SUN_CY,
  discR: HOME_SUN_RADIUS,
  ringScale: 1.25,
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
      svg.removeAttribute(RENDERED_3D_FLAG);
      [SUN_CORE_ID, SUN_CLOUD_ID].forEach((id) => {
        const el = svg.querySelector<SVGElement>(`#${id}`);
        if (el) el.style.fill = "";
      });
      ["position", "left", "top", "width", "height", "margin"].forEach(
        (prop) => svg.style.removeProperty(prop),
      );
    };

    const adopt = (svg: SVGSVGElement) => {
      release();
      adoptedRef.current = svg;
      svg.setAttribute(RENDERED_3D_FLAG, "1");
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
    const landing = liveElementById(LANDING_ANCHOR.id);
    const home = landing ? null : liveElementById(HOME_ANCHOR.id);
    const el = (landing ?? home) as SVGSVGElement | null;
    const config = landing ? LANDING_ANCHOR : HOME_ANCHOR;

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
      (SUN_RADIUS / distance / Math.tan((persp.fov * Math.PI) / 360)) *
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
