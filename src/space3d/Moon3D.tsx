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
 */

const restoreDiscFill = () => {
  const disc = document.getElementById(MOON_DISC_ID) as SVGPathElement | null;
  if (disc) disc.style.fill = "";
};

const Moon3D = () => {
  const size = useThree((s) => s.size);
  const meshRef = useRef<THREE.Mesh>(null);
  const lightGroupRef = useRef<THREE.Group>(null);
  const discTakenRef = useRef(false);

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
  });

  return (
    <>
      <mesh ref={meshRef} material={material} visible={false}>
        <sphereGeometry args={[1, 48, 32]} />
      </mesh>
      {/* Key light offset toward the upper right of the moon (the group is
          positioned/scaled to the moon each frame), matching the old SVG's
          rim highlight, plus faint fill so the dark side stays deep blue */}
      <group ref={lightGroupRef} visible={false}>
        <pointLight
          position={[2.4, 0.7, 1.4]}
          intensity={2.2}
          decay={0}
          color="#cfd4ff"
        />
        <ambientLight intensity={0.55} color="#221a66" />
      </group>
    </>
  );
};

export default Moon3D;
