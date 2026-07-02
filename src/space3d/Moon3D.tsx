import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import {
  MOON_CX,
  MOON_CY,
  MOON_DISC_ID,
  MOON_R,
  MOON_SVG_ID,
  MOON_VIEWBOX,
} from "../MoonSvg";
import { createMoonTexture } from "./textures";
import { domToWorldX, domToWorldY, Z_BODIES } from "./SpaceCanvas";
import { trackSvgById } from "./svgTracking";
import { useScrollProgressRef } from "../hooks/useScrollProgress";

/**
 * 3D moon body. The MoonSvg keeps its animated gradient ring, rotating
 * textPath and eclipse overlay in the DOM; this sphere replaces only the
 * disc fill. The parent div is animated with CSS (rise/set translateY
 * keyframes + opacity transitions), so we read the SVG's box and
 * effective opacity every frame and glue the sphere to it.
 *
 * The SVG disc keeps its own gradient fill until this scene is actually
 * rendering — the fill is blanked imperatively on the first live frame
 * and restored whenever the sphere goes away, so a slow (or failed)
 * three.js chunk never leaves a hollow moon.
 *
 * The moon phases with the page scroll: the key light orbits the sphere
 * in the plane facing the camera, so the terminator sweeps across the
 * disc as you read down the page — a near-full moon up top waning to a
 * thin crescent at the bottom.
 */

// Phase = azimuth of the key light around the moon (x-z plane, so the
// terminator stays roughly vertical). scroll 0 -> near full, scroll 1 ->
// thin waning crescent. A little elevation keeps the top from going dark.
const PHASE_THETA_0 = 0.7;
const PHASE_SWEEP = 1.55;
const PHASE_LIGHT_ELEVATION = 0.7;
const PHASE_LIGHT_DISTANCE = 3;

const restoreDiscFill = () => {
  const disc = document.getElementById(MOON_DISC_ID) as SVGPathElement | null;
  if (disc) disc.style.fill = "";
};

const Moon3D = () => {
  const size = useThree((s) => s.size);
  const gl = useThree((s) => s.gl);
  const meshRef = useRef<THREE.Mesh>(null);
  const lightGroupRef = useRef<THREE.Group>(null);
  const keyLightRef = useRef<THREE.PointLight>(null);
  const discTakenRef = useRef(false);
  const readScrollProgress = useScrollProgressRef();
  // Smoothed phase so flinging the scrollbar eases the terminator across
  const phaseRef = useRef(0);

  const texture = useMemo(() => createMoonTexture(), []);
  const material = useMemo(
    () =>
      new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.95,
        metalness: 0,
        transparent: true,
        opacity: 0,
      }),
    [texture],
  );

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material],
  );

  // Give the disc back to the SVG when the scene unmounts
  useEffect(() => restoreDiscFill, []);

  // If the WebGL context is lost the canvas stops drawing but this
  // component stays mounted — hand the disc back so the moon isn't
  // hollow. Resetting the flag re-blanks it on the first frame after the
  // context is restored.
  useEffect(() => {
    const canvas = gl.domElement;
    const onLost = () => {
      discTakenRef.current = false;
      restoreDiscFill();
    };
    canvas.addEventListener("webglcontextlost", onLost);
    return () => canvas.removeEventListener("webglcontextlost", onLost);
  }, [gl]);

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    const lights = lightGroupRef.current;
    if (!mesh) return;
    const tracked = trackSvgById(MOON_SVG_ID, MOON_VIEWBOX);
    if (!tracked) {
      mesh.visible = false;
      if (lights) lights.visible = false;
      if (discTakenRef.current) {
        // A fresh MoonSvg mount re-renders its gradient fill anyway;
        // resetting the flag makes us take the new disc over again
        discTakenRef.current = false;
        restoreDiscFill();
      }
      return;
    }

    // First live frame: the sphere is drawing now, so blank the flat disc
    if (!discTakenRef.current) {
      const disc = document.getElementById(
        MOON_DISC_ID,
      ) as SVGPathElement | null;
      if (disc) {
        disc.style.fill = "transparent";
        discTakenRef.current = true;
      }
    }

    mesh.visible = tracked.opacity > 0.001;
    if (lights) lights.visible = mesh.visible;

    const x = domToWorldX(
      tracked.offsetX + MOON_CX * tracked.scale,
      size.width,
    );
    const y = domToWorldY(
      tracked.offsetY + MOON_CY * tracked.scale,
      size.height,
    );
    const radius = MOON_R * tracked.scale;
    mesh.position.set(x, y, Z_BODIES);
    mesh.scale.setScalar(radius);
    mesh.rotation.y += delta * 0.04; // slow drift
    material.opacity = tracked.opacity;
    // While semi-transparent, let the stars keep showing through
    material.depthWrite = tracked.opacity > 0.99;

    if (lights) {
      lights.position.set(x, y, Z_BODIES);
      lights.scale.setScalar(radius);
    }

    // Ease the phase toward the current scroll position, then place the
    // key light on that azimuth around the (unit-scaled) sphere.
    const target = readScrollProgress();
    phaseRef.current += (target - phaseRef.current) * Math.min(1, delta * 6);
    const theta = PHASE_THETA_0 + phaseRef.current * PHASE_SWEEP;
    if (keyLightRef.current) {
      keyLightRef.current.position.set(
        PHASE_LIGHT_DISTANCE * Math.sin(theta),
        PHASE_LIGHT_ELEVATION,
        PHASE_LIGHT_DISTANCE * Math.cos(theta),
      );
    }
  });

  return (
    <>
      <mesh ref={meshRef} material={material} visible={false}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      {/* Key light orbits the moon each frame to set the phase (position is
          driven from scroll in useFrame). The group is positioned/scaled to
          the moon; decay=0 makes only the light's direction matter. Ambient
          is kept low so the terminator stays crisp while the dark side still
          reads as deep blue rather than pure black. */}
      <group ref={lightGroupRef} visible={false}>
        <pointLight
          ref={keyLightRef}
          position={[2.4, 0.7, 1.4]}
          intensity={2.8}
          decay={0}
          color="#cfd4ff"
        />
        <ambientLight intensity={0.25} color="#221a66" />
      </group>
    </>
  );
};

export default Moon3D;
