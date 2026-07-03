import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { createPlanetTexture } from "../textures";

/**
 * A small rocky link-asteroid: a jittered icosahedron (lumpy, flat-shaded)
 * that slowly orbits the sun. No orbit ring — these are meant to read as
 * floating debris, and rings would clutter the zoomed landing view. The
 * matching DOM link overlay is glued to it by BodyAnchors via the same
 * planetPosition() the mesh uses, so the two can't drift apart.
 */
export default function Asteroid({ config }: { config: SolarPlanetConfig }) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => createPlanetTexture(config.kind), [config]);
  useEffect(() => () => texture.dispose(), [texture]);

  const geometry = useMemo(() => {
    const geo = new THREE.IcosahedronGeometry(config.radius, 1);
    // One-time deterministic radial jitter so it reads as a lumpy rock
    // (seeded per-vertex from the position, not Math.random, so the two
    // asteroids differ via their radii/phases but stay stable per mount)
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i);
      const seed = Math.sin(v.x * 91.7 + v.y * 47.3 + v.z * 13.1) * 43758.5;
      const jitter = 1 + (seed - Math.floor(seed) - 0.5) * 0.4; // ±20%
      v.multiplyScalar(jitter);
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [config.radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  useFrame(({ clock }, delta) => {
    if (group.current) {
      planetPosition(config, clock.elapsedTime, group.current.position);
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * config.spinSpeed;
      mesh.current.rotation.x += delta * config.spinSpeed * 0.3;
    }
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geometry}>
        <meshStandardMaterial
          map={texture}
          roughness={1}
          metalness={0}
          flatShading
        />
      </mesh>
    </group>
  );
}
