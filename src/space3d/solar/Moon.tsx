import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, MOON, planetPosition } from "./constants";
import moonMapUrl from "../../assets/moon.jpg";

/**
 * Earth's moon: orbits Earth (not the sun), so it lives in a group pinned
 * to Earth's position each frame with the moon offset inside it. The faint
 * ring shows the moon's path around Earth and rides along. Real NASA LROC
 * texture (public domain), bundled locally.
 *
 * Like Earth, the moon self-illuminates faintly (its own map as a dim
 * emissive) so the /about camera — which perches over the moon's far side
 * — still reads it when that face is turned away from the sun.
 */
/** Fade duration for the landing-intro reveal */
const REVEAL_SECONDS = 0.8;

export default function Moon({
  orbitColor,
  orbitOpacity,
  revealed = true,
}: {
  orbitColor: string;
  orbitOpacity: number;
  /** Fades the moon + its orbit ring in (landing intro) */
  revealed?: boolean;
}) {
  const earthGroup = useRef<THREE.Group>(null);
  const moonGroup = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const surfaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const orbitMaterial = useRef<THREE.LineBasicMaterial>(null);
  const revealOpacity = useRef(revealed ? 1 : 0);

  const texture = useMemo(() => {
    const tex = new THREE.TextureLoader().load(moonMapUrl);
    tex.colorSpace = THREE.SRGBColorSpace;
    tex.anisotropy = 4;
    return tex;
  }, []);
  useEffect(() => () => texture.dispose(), [texture]);

  const orbitLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * MOON.orbitRadius,
          0,
          Math.sin(a) * MOON.orbitRadius,
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, []);
  useEffect(() => () => orbitLine.dispose(), [orbitLine]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    if (earthGroup.current) {
      planetPosition(EARTH, t, earthGroup.current.position);
    }
    if (moonGroup.current) {
      const a = MOON.orbitPhase + t * MOON.orbitSpeed;
      moonGroup.current.position.set(
        Math.cos(a) * MOON.orbitRadius,
        0,
        Math.sin(a) * MOON.orbitRadius,
      );
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * MOON.spinSpeed;
    }

    // Landing-intro reveal: fade the moon + its orbit ring in with the planets
    revealOpacity.current = THREE.MathUtils.clamp(
      revealOpacity.current + (revealed ? delta : -delta) / REVEAL_SECONDS,
      0,
      1,
    );
    if (surfaceMaterial.current) {
      surfaceMaterial.current.opacity = revealOpacity.current;
    }
    if (orbitMaterial.current) {
      orbitMaterial.current.opacity = orbitOpacity * revealOpacity.current;
    }
  });

  return (
    <group ref={earthGroup}>
      <lineLoop geometry={orbitLine}>
        <lineBasicMaterial
          ref={orbitMaterial}
          color={orbitColor}
          transparent
          opacity={orbitOpacity}
        />
      </lineLoop>
      <group ref={moonGroup}>
        <mesh ref={mesh}>
          <sphereGeometry args={[MOON.radius, 48, 48]} />
          <meshStandardMaterial
            ref={surfaceMaterial}
            map={texture}
            roughness={1}
            metalness={0}
            emissive="#aab1bd"
            emissiveMap={texture}
            emissiveIntensity={0.22}
            transparent
          />
        </mesh>
      </group>
    </group>
  );
}
