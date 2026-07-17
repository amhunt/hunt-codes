import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";
import { mergeVertices } from "three/examples/jsm/utils/BufferGeometryUtils.js";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { createLogoBadgeTexture, createPlanetTexture } from "../textures";
import { hoverState } from "../../solarHover";
import InteractiveGlow from "./InteractiveGlow";

/**
 * A small rocky link-asteroid: a smooth-shaded icosphere with gentle
 * coherent lumps that slowly orbits the sun. No orbit ring — these are
 * meant to read as floating debris, and rings would clutter the zoomed
 * landing view. The matching DOM link overlay is glued to it by
 * BodyAnchors via the same planetPosition() the mesh uses, so the two
 * can't drift apart.
 *
 * `config.logo` projects a brand badge onto three spots evenly spaced
 * around the rock's spin circumference (DecalGeometry clips the sticker
 * to the mesh, so it follows the lumps and spins with them). Logo rocks
 * spin about the world-vertical axis only — the decals' texture-up stays
 * world-up, so the mark always reads (approximately) right-side up as it
 * pans by.
 *
 * `visible` fades the whole rock (materials' opacity eased per frame):
 * the asteroids are hidden in the landing view and fade in during the
 * swoop to the home perch.
 */
const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;
/** Badge stickers every 120° around the yaw circumference */
const BADGE_YAWS = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

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
  // Start faded out when mounting into a view that hides asteroids
  // (landing, /about), fully shown when mounting straight into /home
  const opacity = useRef(visible ? 1 : 0);
  // Last opacity pushed into the group/materials; starts out-of-band so
  // the first frame always initializes them (the JSX materials mount at
  // opacity 1 regardless of the fade state)
  const appliedOpacity = useRef(-1);

  const texture = useMemo(() => createPlanetTexture(config.kind), [config]);
  useEffect(() => () => texture.dispose(), [texture]);

  const logoTexture = useMemo(
    () => (config.logo ? createLogoBadgeTexture(config.logo) : null),
    [config.logo],
  );
  useEffect(() => () => logoTexture?.dispose(), [logoTexture]);

  const geometry = useMemo(() => {
    // Smooth lumpy rock: a well-subdivided icosphere with welded vertices
    // (smooth normals need shared verts — PolyhedronGeometry ships them
    // duplicated per face), displaced by a few low-frequency sine lumps.
    // Coherent bumps + smooth shading read as a weathered boulder instead
    // of the old low-poly crystal (per-vertex hash jitter, flat shading) —
    // which also fixes the logo decals: on huge flat facets the decal
    // vanished in big chunks the moment a facet turned past edge-on.
    const geo = mergeVertices(new THREE.IcosahedronGeometry(config.radius, 3));
    const pos = geo.getAttribute("position") as THREE.BufferAttribute;
    const v = new THREE.Vector3();
    // Deterministic, but distinct per rock (phases keyed off the radius)
    const phase = config.radius * 97.3;
    for (let i = 0; i < pos.count; i++) {
      v.fromBufferAttribute(pos, i).normalize();
      const lump =
        0.11 * Math.sin(v.x * 3.1 + v.y * 5.2 + phase) +
        0.07 * Math.sin(v.y * 4.3 + v.z * 6.1 + phase * 1.7) +
        0.045 * Math.sin(v.z * 5.7 + v.x * 7.3 + phase * 2.3);
      v.multiplyScalar(config.radius * (1 + lump));
      pos.setXYZ(i, v.x, v.y, v.z);
    }
    pos.needsUpdate = true;
    geo.computeVertexNormals();
    return geo;
  }, [config.radius]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Project the badge onto the surface at three spots evenly spaced
  // around the spin circumference (the rock yaws about local Y, so the
  // marks sweep past the camera every third of a turn). DecalGeometry
  // wants a mesh to shoot at; an identity-transform temp mesh keeps the
  // decal vertices in the rock's local space, so parenting the decals
  // under the spinning mesh keeps them glued to the lumps they were cut
  // from. Stickers are sized so neighbors 120° apart don't overlap (each
  // wraps ~±49°), and the box depth swallows the lump range
  // (~0.78r..1.23r).
  const decalGeometries = useMemo(() => {
    if (!config.logo) return null;
    const r = config.radius;
    const target = new THREE.Mesh(geometry);
    const size = new THREE.Vector3(r * 1.5, r * 1.5, r * 1.6);
    return BADGE_YAWS.map(
      (yaw) =>
        new DecalGeometry(
          target,
          new THREE.Vector3(Math.sin(yaw) * r, 0, Math.cos(yaw) * r),
          new THREE.Euler(0, yaw, 0),
          size,
        ),
    );
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
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      // Only walk the material tree when the pushed value actually
      // changes (appliedOpacity starts at -1, so the first frame always
      // initializes the group/material state)
      if (opacity.current !== appliedOpacity.current) {
        appliedOpacity.current = opacity.current;
        group.current.visible = opacity.current > 0.005;
        group.current.traverse((obj) => {
          const material = (obj as THREE.Mesh).material;
          if (material && !Array.isArray(material)) {
            material.opacity = opacity.current;
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
      {/* clickable-body affordance halo, riding the landing fade */}
      <InteractiveGlow radius={config.radius} opacityRef={opacity} />
      <mesh ref={mesh} geometry={geometry}>
        {/* transparent so the landing->home fade-in can drive opacity;
            the white emissive is the hover brighten (intensity eased
            0 -> 0.9 in useFrame) */}
        <meshStandardMaterial
          ref={rockMaterial}
          map={texture}
          roughness={1}
          metalness={0}
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
