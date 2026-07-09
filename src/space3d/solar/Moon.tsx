import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import { EARTH, MOON, planetPosition } from "./constants";
import { applyOffAxisSquash } from "./offAxisSquash";
import { MOON_VIDEO_OUTLINE_ID } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { createLogoBadgeTexture } from "../textures";
import { hoverState } from "../../solarHover";
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
 *
 * On /about the moon doubles as a video link (the Zip brand-launch reel —
 * see ZipVideoMoon): play-icon badges are decaled onto the surface, and
 * hovering the DOM overlay brightens the moon and pulses its silhouette
 * outline, matching the other link bodies.
 */
/** Fade duration for the landing-intro reveal */
const REVEAL_SECONDS = 0.8;

/** Play badges around the equator: 3 at 120° apart, so from any camera
 *  angle at least one is within 60° of facing the viewer (the moon's
 *  self-spin is glacial — a single badge could hide for minutes). */
const BADGE_YAWS = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

const moonWorldPos = new THREE.Vector3();

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
  const squashWrapper = useRef<THREE.Group>(null);
  const squashCounterRotate = useRef<THREE.Group>(null);
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

  const geometry = useMemo(
    () => new THREE.SphereGeometry(MOON.radius, 48, 48),
    [],
  );
  useEffect(() => () => geometry.dispose(), [geometry]);

  // Play-icon stickers on the surface (same decal treatment as the
  // asteroid badges), riding the moon's slow self-spin
  const badgeMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: createLogoBadgeTexture("play"),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
    [],
  );
  useEffect(
    () => () => {
      badgeMaterial.map?.dispose();
      badgeMaterial.dispose();
    },
    [badgeMaterial],
  );

  const badgeGeometries = useMemo(() => {
    const target = new THREE.Mesh(geometry);
    const r = MOON.radius;
    const size = new THREE.Vector3(r * 0.95, r * 0.95, r * 0.8);
    return BADGE_YAWS.map(
      (yaw) =>
        new DecalGeometry(
          target,
          new THREE.Vector3(Math.sin(yaw) * r, 0, Math.cos(yaw) * r),
          new THREE.Euler(0, yaw, 0),
          size,
        ),
    );
  }, [geometry]);
  useEffect(
    () => () => badgeGeometries.forEach((g) => g.dispose()),
    [badgeGeometries],
  );

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

  useFrame(({ clock, camera, size }, delta) => {
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
      // Cancel the wide-lens corner stretching (fades out up close, e.g.
      // under the about view's moon-adjacent perch)
      if (
        squashWrapper.current &&
        squashCounterRotate.current &&
        earthGroup.current
      ) {
        moonWorldPos
          .copy(earthGroup.current.position)
          .add(moonGroup.current.position);
        applyOffAxisSquash(
          squashWrapper.current,
          squashCounterRotate.current,
          camera,
          moonWorldPos,
          MOON.radius,
        );
      }
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
    badgeMaterial.opacity = revealOpacity.current;
    if (orbitMaterial.current) {
      orbitMaterial.current.opacity = orbitOpacity * revealOpacity.current;
    }

    // Video-link hover (the /about overlay): brighten the moonshine and
    // hand the silhouette to the overlay's pulsing outline paths
    const hovered = hoverState.moon;
    if (surfaceMaterial.current) {
      const ease = Math.min(delta * 6, 1);
      surfaceMaterial.current.emissiveIntensity +=
        ((hovered ? 0.55 : 0.22) - surfaceMaterial.current.emissiveIntensity) *
        ease;
    }
    if (hovered && mesh.current) {
      writeSilhouette(MOON_VIDEO_OUTLINE_ID, [mesh.current], camera, size);
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
        <group ref={squashWrapper}>
          <group ref={squashCounterRotate}>
            <mesh ref={mesh} geometry={geometry}>
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
              {/* Play-icon stickers, riding the spin with the surface */}
              {badgeGeometries.map((badgeGeometry, i) => (
                <mesh
                  key={i}
                  geometry={badgeGeometry}
                  material={badgeMaterial}
                />
              ))}
            </mesh>
          </group>
        </group>
      </group>
    </group>
  );
}
