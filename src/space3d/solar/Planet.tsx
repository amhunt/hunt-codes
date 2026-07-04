import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { createPlanetTexture } from "../textures";
import { hoverState } from "../../solarHover";
import earthMapUrl from "../../assets/earth.jpg";

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
  const surfaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const atmosphereMaterial = useRef<THREE.MeshBasicMaterial>(null);

  const texture = useMemo(() => {
    if (config.kind === "earth") {
      // Real NASA Blue Marble (public domain), bundled locally so there's
      // no runtime CORS dependency. The equirectangular map puts the
      // Arctic at the north pole — exactly what the home camera looks down
      // on — so the visible curve reads as the green, ice-capped northern
      // hemisphere rather than a stylized blob.
      const tex = new THREE.TextureLoader().load(earthMapUrl);
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.anisotropy = 4;
      return tex;
    }
    return createPlanetTexture(config.kind);
  }, [config]);
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
    if (config.kind === "earth") {
      // Ease the glow up while the "About Andrew" ring/planet is hovered:
      // the atmosphere shell thickens and the earthshine brightens
      const hovered = hoverState.earth;
      const ease = Math.min(delta * 6, 1);
      if (atmosphereMaterial.current) {
        atmosphereMaterial.current.opacity +=
          ((hovered ? 0.5 : 0.16) - atmosphereMaterial.current.opacity) * ease;
      }
      if (surfaceMaterial.current) {
        surfaceMaterial.current.emissiveIntensity +=
          ((hovered ? 0.62 : 0.38) -
            surfaceMaterial.current.emissiveIntensity) *
          ease;
      }
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
          {config.kind === "earth" ? (
            // Earth self-illuminates faintly (its own map as the emissive
            // map): the home view faces its night side, which would
            // otherwise be a near-black silhouette. The cool tint reads as
            // earthshine so oceans/land stay recognizable in the dark.
            <meshStandardMaterial
              ref={surfaceMaterial}
              map={texture}
              roughness={0.95}
              metalness={0}
              emissive="#a7bad4"
              emissiveMap={texture}
              emissiveIntensity={0.38}
            />
          ) : (
            <meshStandardMaterial
              map={texture}
              roughness={0.95}
              metalness={0}
            />
          )}
        </mesh>
        {config.kind === "earth" && (
          // faint atmosphere shell
          <mesh scale={1.04}>
            <sphereGeometry args={[config.radius, 48, 48]} />
            <meshBasicMaterial
              ref={atmosphereMaterial}
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
