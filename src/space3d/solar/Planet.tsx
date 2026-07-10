import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { applyOffAxisSquash } from "./offAxisSquash";
import { createPlanetTexture } from "../textures";
import { hoverState } from "../../solarHover";
import { EARTH_ABOUT_OUTLINE_ID } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import AboutRing from "./AboutRing";
import InteractiveGlow from "./InteractiveGlow";
import earthMapUrl from "../../assets/earth.jpg";

/**
 * One orbiting planet + its orbit ring, ported from hunt-codes-3.
 * Textures are the shared procedural canvas maps; Earth gets a faint
 * back-side atmosphere shell. Positions come from the shared clock so
 * the camera rig can compute the same orbit for its Earth perch. Earth
 * also carries the curved "ABOUT ME" link label (space3d AboutRing).
 */
/** Fade duration for the landing-intro reveal */
const REVEAL_SECONDS = 0.8;

// >1 white multiplier on Earth's diffuse: the sun-facing side (diffuse =
// map x color x sunlight) brightens, while the night side — lit almost
// entirely by the emissive earthshine — barely moves
const EARTH_SUNLIT_BOOST = new THREE.Color(1.45, 1.45, 1.45);

export default function Planet({
  config,
  orbitColor,
  orbitOpacity,
  isNightMode = true,
  aboutActive = false,
  revealed = true,
}: {
  config: SolarPlanetConfig;
  orbitColor: string;
  orbitOpacity: number;
  /** Drives the Earth "ABOUT ME" label color (white at night, purple in day) */
  isNightMode?: boolean;
  /** Show the Earth "ABOUT ME" label (home view only) */
  aboutActive?: boolean;
  /** Fades the planet + its orbit ring in (landing intro) */
  revealed?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const squashWrapper = useRef<THREE.Group>(null);
  const squashCounterRotate = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const surfaceMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const atmosphereMaterial = useRef<THREE.MeshBasicMaterial>(null);
  const orbitMaterial = useRef<THREE.LineBasicMaterial>(null);
  const revealOpacity = useRef(revealed ? 1 : 0);
  // Atmosphere base opacity (hover-eased); multiplied by the reveal so the
  // fade-in and the hover swell compose instead of fighting each other
  const atmosphereBase = useRef(0.16);

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

  useFrame(({ clock, camera, size }, delta) => {
    if (group.current) {
      planetPosition(config, clock.elapsedTime, group.current.position);
      // Cancel the wide-lens corner stretching (fades out up close)
      if (squashWrapper.current && squashCounterRotate.current) {
        applyOffAxisSquash(
          squashWrapper.current,
          squashCounterRotate.current,
          camera,
          group.current.position,
          config.radius,
        );
      }
    }
    if (mesh.current) {
      mesh.current.rotation.y += delta * config.spinSpeed;
    }

    // Landing-intro reveal: ramp opacity 0→1 (or back) and push it into the
    // surface + orbit ring, so the planets fade in a beat after the sun.
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

    if (config.kind === "earth") {
      // Ease the glow up while the "About Me" ring/planet is hovered:
      // the atmosphere shell thickens and the earthshine brightens
      const hovered = hoverState.earth;
      const ease = Math.min(delta * 6, 1);
      atmosphereBase.current +=
        ((hovered ? 0.5 : 0.16) - atmosphereBase.current) * ease;
      if (atmosphereMaterial.current) {
        atmosphereMaterial.current.opacity =
          atmosphereBase.current * revealOpacity.current;
      }
      if (surfaceMaterial.current) {
        surfaceMaterial.current.emissiveIntensity +=
          ((hovered ? 0.62 : 0.28) -
            surfaceMaterial.current.emissiveIntensity) *
          ease;
      }
      if (hovered && mesh.current) {
        // Same pulsing hover outline as the link asteroids/satellite: cut
        // Earth's screen silhouette and hand it to the /about overlay's
        // outline paths (Earth stays a circle while spinning, so no
        // spin-freeze is needed here)
        writeSilhouette(EARTH_ABOUT_OUTLINE_ID, [mesh.current], camera, size);
      }
    }
  });

  return (
    <>
      <lineLoop geometry={orbitLine}>
        <lineBasicMaterial
          ref={orbitMaterial}
          color={orbitColor}
          transparent
          opacity={orbitOpacity}
        />
      </lineLoop>
      <group ref={group}>
        <group ref={squashWrapper}>
          <group ref={squashCounterRotate}>
            <mesh ref={mesh}>
              <sphereGeometry args={[config.radius, 48, 48]} />
              {config.kind === "earth" ? (
                // Earth self-illuminates faintly (its own map as the
                // emissive map): the home view faces its night side, which
                // would otherwise be a near-black silhouette. The cool tint
                // reads as earthshine so oceans/land stay recognizable in
                // the dark.
                <meshStandardMaterial
                  ref={surfaceMaterial}
                  map={texture}
                  color={EARTH_SUNLIT_BOOST}
                  roughness={0.95}
                  metalness={0}
                  emissive="#a7bad4"
                  emissiveMap={texture}
                  emissiveIntensity={0.28}
                  transparent
                />
              ) : (
                <meshStandardMaterial
                  ref={surfaceMaterial}
                  map={texture}
                  roughness={0.95}
                  metalness={0}
                  transparent
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
        </group>
        {/* Curved "ABOUT ME" link label, billboarded around Earth. Lives in
            the group (not the squash wrapper) so it stays put over Earth. */}
        {config.kind === "earth" && (
          <>
            <AboutRing active={aboutActive} isNightMode={isNightMode} />
            {/* clickable-body affordance halo (the /about link, home only;
                a lighter touch than the small rocks — Earth is big) */}
            <InteractiveGlow
              radius={config.radius}
              opacityRef={revealOpacity}
              enabled={aboutActive}
              strength={0.3}
            />
          </>
        )}
      </group>
    </>
  );
}
