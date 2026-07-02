import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SUN_RADIUS } from "./constants";
import { createSunGlowTexture, createSunTexture } from "../textures";

/**
 * The sun, ported from hunt-codes-3: a slowly rotating sphere with the
 * mottled golden canvas texture, a soft glow sprite (billboarded, so the
 * corona reads from any camera angle), and the point light that lights
 * the planets.
 */
export default function Sun() {
  const mesh = useRef<THREE.Mesh>(null);
  const texture = useMemo(() => createSunTexture(), []);
  const glowTexture = useMemo(() => createSunGlowTexture(), []);

  useEffect(
    () => () => {
      texture.dispose();
      glowTexture.dispose();
    },
    [texture, glowTexture],
  );

  useFrame((_, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.04;
  });

  return (
    <group>
      <mesh ref={mesh}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <meshBasicMaterial map={texture} toneMapped={false} />
      </mesh>
      {/* soft corona billboard */}
      <sprite scale={[SUN_RADIUS * 6, SUN_RADIUS * 6, 1]}>
        <spriteMaterial
          map={glowTexture}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </sprite>
      {/* the sun is the scene's light source */}
      <pointLight intensity={900} distance={0} decay={2} color="#fff2d5" />
    </group>
  );
}
