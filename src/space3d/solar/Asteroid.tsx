import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { createLogoBadgeTexture, createPlanetTexture } from "../textures";
import { hoverState } from "../../solarHover";

/**
 * A small rocky link-asteroid: a jittered icosahedron (lumpy, flat-shaded)
 * that slowly orbits the sun. No orbit ring — these are meant to read as
 * floating debris, and rings would clutter the zoomed landing view. The
 * matching DOM link overlay is glued to it by BodyAnchors via the same
 * planetPosition() the mesh uses, so the two can't drift apart.
 *
 * `config.logo` projects a brand badge onto two opposite sides of the
 * rock's surface (DecalGeometry clips the sticker to the mesh, so it
 * follows the lumps and spins with them). Logo rocks spin about the
 * world-vertical axis only — the decals' texture-up stays world-up, so
 * the mark always reads (approximately) right-side up as it pans by.
 *
 * `visible` fades the whole rock (materials' opacity eased per frame):
 * the asteroids are hidden in the landing view and fade in during the
 * swoop to the home perch.
 */
const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;

export default function Asteroid({
  config,
  visible = true,
}: {
  config: SolarPlanetConfig;
  visible?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const rockMaterial = useRef<THREE.MeshStandardMaterial>(null);
  // Start faded out when mounting into a view that hides asteroids (the
  // landing page), fully shown when mounting straight into /home
  const opacity = useRef(visible ? 1 : 0);

  const texture = useMemo(() => createPlanetTexture(config.kind), [config]);
  useEffect(() => () => texture.dispose(), [texture]);

  const logoTexture = useMemo(
    () => (config.logo ? createLogoBadgeTexture(config.logo) : null),
    [config.logo],
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
    if (!config.logo) return null;
    const r = config.radius;
    const target = new THREE.Mesh(geometry);
    const size = new THREE.Vector3(r * 1.82, r * 1.82, r * 1.6);
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
  }, [config.logo, geometry, config.radius]);
  useEffect(
    () => () => decalGeometries?.forEach((g) => g.dispose()),
    [decalGeometries],
  );

  useFrame(({ clock, camera, size }, delta) => {
    const hovered = hoverState.asteroid === config.name;

    if (group.current) {
      planetPosition(config, clock.elapsedTime, group.current.position);

      // Linear ramp toward shown/hidden — a slow 3s reveal riding the
      // landing->home swoop, a quicker 1s exit on the way back — pushed
      // into the rock and decal materials (a group-level opacity doesn't
      // exist in three)
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      const next = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      // Only walk the material tree while the fade is actually moving
      if (next !== opacity.current) {
        opacity.current = next;
        group.current.visible = next > 0.005;
        group.current.traverse((obj) => {
          const material = (obj as THREE.Mesh).material;
          if (material && !Array.isArray(material)) {
            material.opacity = next;
          }
        });
      }
    }
    // Hover freezes the tumble (the outline below is cut from the frozen
    // pose, and a spinning rock under a static outline would look broken)
    if (mesh.current && !hovered) {
      mesh.current.rotation.y += delta * config.spinSpeed;
      // Logo rocks skip the x-axis tumble: any pitch would tilt the badge
      // (projected with texture-up = +y), and yaw-only spin can't
      if (!config.logo) {
        mesh.current.rotation.x += delta * config.spinSpeed * 0.3;
      }
    }
    if (rockMaterial.current) {
      // Hovering the rock's link washes the surface out to near-white
      // (flat white emissive over the texture); the unlit decal badges
      // have their own materials and don't change
      const ease = Math.min(delta * 6, 1);
      rockMaterial.current.emissiveIntensity +=
        ((hovered ? 0.9 : 0) - rockMaterial.current.emissiveIntensity) * ease;
    }
    if (hovered && mesh.current) {
      // Cut the rock's screen silhouette in its frozen pose and hand it to
      // the DOM overlay's outline paths. Recomputed per frame (cheap: a
      // couple hundred vertices) so it tracks the slow orbital drift; the
      // SHAPE stays put because the spin is frozen while hovered.
      writeSilhouette(
        asteroidOutlineId(config.name),
        [mesh.current],
        camera,
        size,
      );
    }
  });

  return (
    <group ref={group}>
      <mesh ref={mesh} geometry={geometry}>
        {/* transparent so the landing->home fade-in can drive opacity;
            the white emissive is the hover brighten (intensity eased
            0 -> 0.9 in useFrame) */}
        <meshStandardMaterial
          ref={rockMaterial}
          map={texture}
          roughness={1}
          metalness={0}
          flatShading
          transparent
          emissive="#ffffff"
          emissiveIntensity={0}
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
