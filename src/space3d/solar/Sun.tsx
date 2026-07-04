import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SUN_RADIUS, sunState } from "./constants";
import { createSunGlowTexture, createSunTexture } from "../textures";

/**
 * The sun, ported from hunt-codes-3: a slowly rotating sphere with the
 * mottled golden canvas texture, a soft glow sprite (billboarded, so the
 * corona reads from any camera angle), and the point light that lights
 * the planets. The whole group eases toward a per-view scale and
 * publishes the rendered scale so the DOM rings can track it; the glow
 * sprite eases toward a per-view size too — from the home sun-perch the
 * full 6x glow would span the whole frame and wash out the stars, so
 * that view shrinks it to hug the limb.
 */
// Surface brightness multipliers (meshBasicMaterial.color, toneMapped
// off, so components >1 push the texture toward white). Day mode reads
// noticeably brighter/whiter against the light gradient; night gets a
// subtler lift.
const DAY_TINT = new THREE.Color(1.55, 1.55, 1.7);
const NIGHT_TINT = new THREE.Color(1.12, 1.12, 1.15);

export default function Sun({
  targetScale = 1,
  targetGlowScale = 6,
  isNightMode,
}: {
  targetScale?: number;
  /** Glow sprite size as a multiple of SUN_RADIUS (eased) */
  targetGlowScale?: number;
  isNightMode: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const spotsMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => createSunTexture(), []);
  // A second, independently-random blotch layer: crossfading it in and
  // out over the base makes the surface spots slowly shift
  const spotsTexture = useMemo(() => createSunTexture(), []);
  const glowTexture = useMemo(() => createSunGlowTexture(), []);

  useEffect(
    () => () => {
      texture.dispose();
      spotsTexture.dispose();
      glowTexture.dispose();
    },
    [texture, spotsTexture, glowTexture],
  );

  useFrame(({ clock }, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.013;
    if (spotsMaterialRef.current) {
      // Slow morph between the two blotch patterns (~30s round trip)
      spotsMaterialRef.current.opacity =
        0.5 + 0.5 * Math.sin((clock.elapsedTime * Math.PI * 2) / 30);
    }
    const ease = Math.min(1, delta * 2.5);
    if (group.current) {
      const current = group.current.scale.x;
      const next = current + (targetScale - current) * ease;
      group.current.scale.setScalar(next);
      sunState.scale = next;
    }
    if (glow.current) {
      const target = SUN_RADIUS * targetGlowScale;
      const current = glow.current.scale.x;
      const next = current + (target - current) * ease;
      glow.current.scale.set(next, next, 1);
    }
    if (materialRef.current) {
      // Ease the brightness so the mode toggle doesn't pop; the spot
      // layer follows the same tint or the crossfade would pulse dark
      materialRef.current.color.lerp(
        isNightMode ? NIGHT_TINT : DAY_TINT,
        ease,
      );
      if (spotsMaterialRef.current) {
        spotsMaterialRef.current.color.copy(materialRef.current.color);
      }
    }
  });

  return (
    <group ref={group}>
      <mesh ref={mesh}>
        <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
        <meshBasicMaterial ref={materialRef} map={texture} toneMapped={false} />
        {/* Crossfading spot layer, drawn just over the base surface */}
        <mesh scale={1.001} renderOrder={1}>
          <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
          <meshBasicMaterial
            ref={spotsMaterialRef}
            map={spotsTexture}
            toneMapped={false}
            transparent
            opacity={0}
            depthWrite={false}
          />
        </mesh>
      </mesh>
      {/* soft corona billboard */}
      <sprite ref={glow} scale={[SUN_RADIUS * 6, SUN_RADIUS * 6, 1]}>
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
