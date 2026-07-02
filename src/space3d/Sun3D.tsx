import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import {
  RENDERED_3D_FLAG,
  SOLAR_SYSTEM_SVG_ID,
  SOLAR_SYSTEM_VIEWBOX,
  SUN_CENTER,
  SUN_CLOUD_ID,
  SUN_CORE_ID,
  SUN_SURFACE_RADIUS,
} from "../landingScene";
import {
  HOME_SUN_CX,
  HOME_SUN_CY,
  HOME_SUN_RADIUS,
  HOME_SUN_SVG_ID,
  HOME_SUN_VIEWBOX,
} from "../SunSvg";
import {
  createSunCoronaMaterial,
  createSunSurfaceMaterial,
  SUN_CORONA_RATIO,
  SUN_OCCLUDER_RATIO,
  SUN_TIME_PERIOD,
} from "./sunShader";
import { domToWorldX, domToWorldY, Z_OCCLUDER } from "./SpaceCanvas";
import { liveElementById, trackSvgById } from "./svgTracking";

/**
 * THE sun. One shader-sun object (plasma surface + corona, ./sunShader)
 * shared by every page: it glues itself to whichever sun SVG is on screen
 * — the small landing sun or the big home sun — and when the target
 * changes it FLIES to the new position and size instead of snapping, so
 * clicking "enter" on the landing page sends the same sun gliding to its
 * home-page corner. The canvas persists across routes (Space3DBackground)
 * precisely so this object never remounts mid-flight.
 *
 * Like Moon3D, the SVGs keep their decorative shells (the landing "enter"
 * ring, the home orbiting links); only the disc fill is blanked
 * while this scene renders, and restored whenever it goes away, so a slow
 * or failed three.js chunk never leaves a hollow sun.
 *
 * On home the SVG's own CSS rise/set choreography is suppressed (the
 * RENDERED_3D_FLAG attribute + an App.scss :has rule pin the container at
 * rest) and this component drives the motion itself: flight from the
 * landing sun and sunrise from below the viewport. The home sun stays up
 * in both day and night mode (Galaxy forces it), so it never dives.
 * Without WebGL the flag is never set and the CSS choreography runs.
 */

interface SunSpot {
  x: number;
  y: number;
  r: number;
  o: number;
}

type Mode = "hidden" | "glue" | "fly";

const FLY_S = 1.2; // landing -> home flight / sunrise duration

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

const lerpSpot = (a: SunSpot, b: SunSpot, t: number): SunSpot => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
  r: a.r + (b.r - a.r) * t,
  o: a.o + (b.o - a.o) * t,
});

const Sun3D = () => {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const surfaceRef = useRef<THREE.Mesh>(null);
  const coronaRef = useRef<THREE.Mesh>(null);
  const occluderRef = useRef<THREE.Mesh>(null);

  const modeRef = useRef<Mode>("hidden");
  const tRef = useRef(0);
  const flyFromRef = useRef<SunSpot | null>(null);
  const renderedRef = useRef<SunSpot>({ x: 0, y: 0, r: 1, o: 0 });
  const adoptedRef = useRef<Element | null>(null);
  const adoptedIsHomeRef = useRef(false);
  const trimElsRef = useRef<SVGElement[]>([]);

  const surfaceMaterial = useMemo(() => createSunSurfaceMaterial(), []);
  const coronaMaterial = useMemo(() => createSunCoronaMaterial(), []);

  const helpers = useMemo(() => {
    /** Fade the SVG trim (the orbiting links) with the flight/dive. */
    const setTrimOpacity = (value: number | null) => {
      trimElsRef.current.forEach((el) => {
        el.style.opacity = value == null ? "" : String(value);
      });
    };

    /** Give the adopted SVG its disc + choreography back. */
    const release = () => {
      const root = adoptedRef.current;
      adoptedRef.current = null;
      setTrimOpacity(null);
      trimElsRef.current = [];
      if (!root) return;
      if (adoptedIsHomeRef.current) root.removeAttribute(RENDERED_3D_FLAG);
      [SUN_CORE_ID, SUN_CLOUD_ID].forEach((id) => {
        const el = root.querySelector<SVGElement>(`#${id}`);
        if (el) el.style.fill = "";
      });
    };

    /** Take over a sun SVG: blank its disc, pin the home choreography. */
    const adopt = (root: Element, isHome: boolean) => {
      release();
      adoptedRef.current = root;
      adoptedIsHomeRef.current = isHome;
      // On home the flag (+ the .planet1_day:has rule) pins the container
      // at rest so the CSS rise/set can't double-move the links layer. On
      // the landing svg the flag belongs to SolarSystem3D (planets/labels)
      // — leave it alone there.
      if (isHome) root.setAttribute(RENDERED_3D_FLAG, "1");
      [SUN_CORE_ID, SUN_CLOUD_ID].forEach((id) => {
        const el = root.querySelector<SVGElement>(`#${id}`);
        if (el) el.style.fill = "transparent";
      });
      trimElsRef.current = isHome
        ? (["#sunText"]
            .map((sel) => root.querySelector<SVGElement>(sel))
            .filter(Boolean) as SVGElement[])
        : [];
    };

    return { setTrimOpacity, release, adopt };
  }, []);

  useEffect(
    () => () => {
      surfaceMaterial.dispose();
      coronaMaterial.dispose();
    },
    [surfaceMaterial, coronaMaterial],
  );

  // Restore the SVG disc on unmount, and on WebGL context loss (the canvas
  // stops drawing while we stay mounted); the per-frame re-adopt picks the
  // disc back up once the context is restored.
  useEffect(() => helpers.release, [helpers]);
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => helpers.release();
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl, helpers]);

  useFrame((_, rawDelta) => {
    // Clamped like the rest of the scenes (SolarSystem3D caps at 100ms):
    // after a backgrounded tab or GC pause, a huge delta would otherwise
    // teleport the flight/dive to its end instead of animating
    const delta = Math.min(rawDelta, 0.1);
    // Wrapped to the shader's noise-orbit period (fp32 safety, seamless)
    const time =
      (surfaceMaterial.uniforms.uTime.value + delta) % SUN_TIME_PERIOD;
    surfaceMaterial.uniforms.uTime.value = time;
    coronaMaterial.uniforms.uTime.value = time;

    const track = (
      id: string,
      viewBox: number,
      cx: number,
      cy: number,
      radius: number,
    ) => {
      const tracked = trackSvgById(id, viewBox);
      const root = liveElementById(id);
      if (!tracked || !root) return null;
      return {
        root,
        spot: {
          x: domToWorldX(tracked.offsetX + cx * tracked.scale, size.width),
          y: domToWorldY(tracked.offsetY + cy * tracked.scale, size.height),
          r: radius * tracked.scale,
          o: tracked.opacity,
        } as SunSpot,
      };
    };

    const landing = track(
      SOLAR_SYSTEM_SVG_ID,
      SOLAR_SYSTEM_VIEWBOX,
      SUN_CENTER,
      SUN_CENTER,
      SUN_SURFACE_RADIUS,
    );
    const home = landing
      ? null
      : track(
          HOME_SUN_SVG_ID,
          HOME_SUN_VIEWBOX,
          HOME_SUN_CX,
          HOME_SUN_CY,
          HOME_SUN_RADIUS,
        );
    const target = landing ?? home;

    // (Re)adopt when the sun svg changed: a route switch (landing <-> home)
    // or a fresh mount of the same page's svg.
    if (target && target.root !== adoptedRef.current) {
      const wasVisible =
        modeRef.current !== "hidden" && renderedRef.current.o > 0.02;
      helpers.adopt(target.root, !!home);
      if (wasVisible) {
        // The one sun flies from wherever it is to the new page's spot
        flyFromRef.current = { ...renderedRef.current };
        tRef.current = 0;
        modeRef.current = "fly";
      } else if (home) {
        // Nothing on screen yet: rise from below the viewport
        flyFromRef.current = {
          x: target.spot.x,
          y: -size.height / 2 - target.spot.r * 1.5,
          r: target.spot.r,
          o: 1,
        };
        tRef.current = 0;
        modeRef.current = "fly";
      } else {
        // Landing sun appears in place (it has its own CSS fade-in)
        modeRef.current = "glue";
      }
    } else if (!target && adoptedRef.current) {
      // Sun svg gone (route left the sun behind): drop out.
      helpers.release();
      modeRef.current = "hidden";
    }

    // Advance the rendered spot
    let spot: SunSpot | null = null;
    if (modeRef.current === "glue") {
      spot = target ? target.spot : null;
    } else if (modeRef.current === "fly") {
      if (!target || !flyFromRef.current) {
        helpers.release();
        modeRef.current = "hidden";
      } else {
        tRef.current = Math.min(1, tRef.current + delta / FLY_S);
        const e = easeInOutCubic(tRef.current);
        spot = lerpSpot(flyFromRef.current, target.spot, e);
        // The orbiting links fade in with the arriving sun
        if (adoptedIsHomeRef.current) helpers.setTrimOpacity(e);
        if (tRef.current >= 1) {
          modeRef.current = "glue";
          helpers.setTrimOpacity(null);
        }
      }
    }

    if (spot) renderedRef.current = spot;
    const visible = !!spot && spot.o > 0.01;
    const surface = surfaceRef.current;
    const corona = coronaRef.current;
    const occluder = occluderRef.current;
    if (surface) surface.visible = visible;
    if (corona) corona.visible = visible;
    if (!spot) {
      if (occluder) occluder.visible = false;
      return;
    }

    surfaceMaterial.uniforms.uOpacity.value = spot.o;
    coronaMaterial.uniforms.uOpacity.value = spot.o;
    // Don't cull stars behind the disc until it's mostly opaque, else they
    // vanish behind an invisible sun (matches the occluder gating)
    surfaceMaterial.depthWrite = spot.o > 0.5;
    if (surface) {
      surface.position.set(spot.x, spot.y, Z_OCCLUDER + 1);
      surface.scale.setScalar(spot.r);
    }
    if (corona) {
      corona.position.set(spot.x, spot.y, Z_OCCLUDER + 0.5);
      corona.scale.setScalar(spot.r * SUN_CORONA_RATIO);
    }
    if (occluder) {
      occluder.position.set(spot.x, spot.y, Z_OCCLUDER);
      occluder.scale.setScalar(spot.r * SUN_OCCLUDER_RATIO);
      occluder.visible = spot.o > 0.5;
    }
  });

  return (
    <>
      {/* Invisible depth-only disc so GPU stars don't twinkle on top of
          the sun (the canvas sits above the landing SVG) */}
      <mesh ref={occluderRef} renderOrder={-1} visible={false}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      {/* Additive corona haze, behind the surface so the opaque disc masks
          its center; depthTest keeps it from bleeding over the disc */}
      <mesh
        ref={coronaRef}
        material={coronaMaterial}
        renderOrder={1}
        visible={false}
      >
        <circleGeometry args={[1, 64]} />
      </mesh>
      {/* GLSL sun surface, replacing the blanked SVG disc */}
      <mesh
        ref={surfaceRef}
        material={surfaceMaterial}
        renderOrder={2}
        visible={false}
      >
        <circleGeometry args={[1, 64]} />
      </mesh>
    </>
  );
};

export default Sun3D;
