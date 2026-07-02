import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, SolarPlanetConfig } from "./constants";
import { createPlanetTexture } from "../textures";

/**
 * One orbiting planet + its orbit ring, ported from hunt-codes-3.
 * Textures are the shared procedural canvas maps; Earth gets a faint
 * back-side atmosphere shell. Positions come from the shared clock so
 * the camera rig can compute the same orbit for its Earth perch.
 */
export default function Planet({
  config,
  orbitColor,
  orbitOpacity,
}: {
  config: SolarPlanetConfig;
  orbitColor: string;
  orbitOpacity: number;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => createPlanetTexture(config.kind), [config]);
  useEffect(() => () => texture.dispose(), [texture]);

  const orbitLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * config.orbitRadius,
          0,
          Math.sin(a) * config.orbitRadius,
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [config.orbitRadius]);
  useEffect(() => () => orbitLine.dispose(), [orbitLine]);

  useFrame(({ clock }, delta) => {
    if (group.current) {
      planetPosition(config, clock.elapsedTime, group.current.position);
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * config.spinSpeed;
    }
  });

  return (
    <>
      <lineLoop geometry={orbitLine}>
        <lineBasicMaterial
          color={orbitColor}
          transparent
          opacity={orbitOpacity}
        />
      </lineLoop>
      <group ref={group}>
        <mesh ref={mesh}>
          <sphereGeometry args={[config.radius, 48, 48]} />
          <meshStandardMaterial map={texture} roughness={0.95} metalness={0} />
        </mesh>
        {config.kind === "earth" && (
          // faint atmosphere shell
          <mesh scale={1.04}>
            <sphereGeometry args={[config.radius, 48, 48]} />
            <meshBasicMaterial
              color="#6ab0ff"
              transparent
              opacity={0.16}
              side={THREE.BackSide}
            />
          </mesh>
        )}
      </group>
    </>
  );
}
