import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { createGitHubMarkTexture, createPlanetTexture } from "../textures";

/**
 * A small rocky link-asteroid: a jittered icosahedron (lumpy, flat-shaded)
 * that slowly orbits the sun. No orbit ring — these are meant to read as
 * floating debris, and rings would clutter the zoomed landing view. The
 * matching DOM link overlay is glued to it by BodyAnchors via the same
 * planetPosition() the mesh uses, so the two can't drift apart.
 *
 * `withGithubLogo` projects a GitHub-mark badge onto two opposite sides of
 * the rock's surface (DecalGeometry clips the sticker to the mesh, so it
 * follows the lumps and spins with them).
 */
export default function Asteroid({
  config,
  withGithubLogo = false,
}: {
  config: SolarPlanetConfig;
  withGithubLogo?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);

  const texture = useMemo(() => createPlanetTexture(config.kind), [config]);
  useEffect(() => () => texture.dispose(), [texture]);

  const logoTexture = useMemo(
    () => (withGithubLogo ? createGitHubMarkTexture() : null),
    [withGithubLogo],
  );
  useEffect(() => () => logoTexture?.dispose(), [logoTexture]);

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

  // Project the badge onto the surface from +z and -z. DecalGeometry wants
  // a mesh to shoot at; an identity-transform temp mesh keeps the decal
  // vertices in the rock's local space, so parenting the decals under the
  // spinning mesh keeps them glued to the lumps they were cut from. The
  // box is sized to swallow the full jitter range (0.8r..1.2r).
  const decalGeometries = useMemo(() => {
    if (!withGithubLogo) return null;
    const r = config.radius;
    const target = new THREE.Mesh(geometry);
    const size = new THREE.Vector3(r * 1.4, r * 1.4, r * 1.6);
    return [
      new DecalGeometry(
        target,
        new THREE.Vector3(0, 0, r),
        new THREE.Euler(0, 0, 0),
        size,
      ),
      new DecalGeometry(
        target,
        new THREE.Vector3(0, 0, -r),
        new THREE.Euler(0, Math.PI, 0),
        size,
      ),
    ];
  }, [withGithubLogo, geometry, config.radius]);
  useEffect(
    () => () => decalGeometries?.forEach((g) => g.dispose()),
    [decalGeometries],
  );

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
        {logoTexture &&
          decalGeometries?.map((decalGeometry, i) => (
            <mesh key={i} geometry={decalGeometry}>
              {/* Unlit so the badge stays legible on the rock's dark side;
                  polygonOffset floats the decal off the faces it copies so
                  they don't z-fight */}
              <meshBasicMaterial
                map={logoTexture}
                transparent
                depthWrite={false}
                polygonOffset
                polygonOffsetFactor={-4}
              />
            </mesh>
          ))}
      </mesh>
    </group>
  );
}
