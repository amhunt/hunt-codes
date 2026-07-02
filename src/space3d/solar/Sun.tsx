import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SUN_RADIUS, sunState } from "./constants";
import { createSunGlowTexture, createSunTexture } from "../textures";

/**
 * The sun, ported from hunt-codes-3: a slowly rotating sphere with the
 * mottled golden canvas texture, a soft glow sprite (billboarded, so the
 * corona reads from any camera angle), and the point light that lights
 * the planets. The whole group eases toward a per-view scale (the home
 * view shows it a bit larger) and publishes the rendered scale so the
 * DOM rings can track it.
 */
export default function Sun({ targetScale = 1 }: { targetScale?: number }) {
  const group = useRef<THREE.Group>(null);
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
    if (group.current) {
      const current = group.current.scale.x;
      const next =
        current + (targetScale - current) * Math.min(1, delta * 2.5);
      group.current.scale.setScalar(next);
      sunState.scale = next;
    }
  });

  return (
    <group ref={group}>
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
