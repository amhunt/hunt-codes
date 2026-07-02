import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import { createMoonTexture } from "./textures";
import { domToWorldX, domToWorldY, Z_BODIES } from "./SpaceCanvas";

/**
 * 3D moon body. The MoonSvg keeps its animated gradient ring, rotating
 * textPath and eclipse overlay in the DOM; this sphere replaces only the
 * flat disc fill. The parent div is animated with CSS (rise/set translateY
 * keyframes + opacity transitions), so we read the SVG's bounding rect and
 * effective opacity every frame and glue the sphere to it. When the SVG
 * isn't in the DOM (day mode, landing page), the sphere hides itself.
 */

export const MOON_SVG_ID = "moon-svg";
// MoonSvg circle: center (275, 276), r 200 in a 550 viewBox
const MOON_VIEWBOX = 550;
const MOON_CX = 275;
const MOON_CY = 276;
const MOON_R = 200;

const Moon3D = () => {
  const size = useThree((s) => s.size);
  const meshRef = useRef<THREE.Mesh>(null);
  const lightGroupRef = useRef<THREE.Group>(null);

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
    [texture]
  );

  useEffect(
    () => () => {
      texture.dispose();
      material.dispose();
    },
    [texture, material]
  );

  useFrame((_, delta) => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const svg = document.getElementById(MOON_SVG_ID);
    if (!svg) {
      mesh.visible = false;
      if (lightGroupRef.current) lightGroupRef.current.visible = false;
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0) {
      mesh.visible = false;
      return;
    }

    // Effective opacity: the rise/set opacity lives on ancestor divs
    let opacity = 1;
    let el: HTMLElement | null = svg as unknown as HTMLElement;
    for (let depth = 0; el && depth < 3; depth++) {
      opacity *= parseFloat(getComputedStyle(el).opacity) || 0;
      el = el.parentElement;
    }
    mesh.visible = opacity > 0.001;
    if (lightGroupRef.current) lightGroupRef.current.visible = mesh.visible;

    const scale = Math.min(rect.width, rect.height) / MOON_VIEWBOX;
    const x = domToWorldX(rect.left + MOON_CX * scale, size.width);
    const y = domToWorldY(rect.top + MOON_CY * scale, size.height);
    const radius = MOON_R * scale;
    mesh.position.set(x, y, Z_BODIES);
    mesh.scale.setScalar(radius);
    mesh.rotation.y += delta * 0.04; // slow drift
    material.opacity = opacity;
    // While semi-transparent, let the stars keep showing through
    material.depthWrite = opacity > 0.99;

    if (lightGroupRef.current) {
      lightGroupRef.current.position.set(x, y, Z_BODIES);
      lightGroupRef.current.scale.setScalar(radius);
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
        <pointLight position={[2.4, 0.7, 1.4]} intensity={2.2} decay={0} color="#cfd4ff" />
        <ambientLight intensity={0.55} color="#221a66" />
      </group>
    </>
  );
};

export default Moon3D;
