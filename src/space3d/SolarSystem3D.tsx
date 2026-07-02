import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import {
  PLANET_CONFIGS,
  SOLAR_SYSTEM_CENTER,
  SOLAR_SYSTEM_SVG_ID,
  SOLAR_SYSTEM_VIEWBOX,
  SUN_CENTER,
  SUN_OCCLUDER_RADIUS,
} from "../landingScene";
import { createPlanetTexture, createRingTexture } from "./textures";
import { domToWorldX, domToWorldY, Z_BODIES, Z_OCCLUDER } from "./SpaceCanvas";
import { liveElementById, trackSvgById } from "./svgTracking";

/**
 * 3D planets for the landing solar system. The sun, orbit paths and the
 * trailing text labels stay in the Landing SVG (the sun holds the "enter"
 * link); this scene tracks the SVG's on-screen box every frame and renders
 * the planets in the same coordinate space, so the two layers stay glued.
 *
 * The SVG's own flat planets are the always-on fallback: while this scene
 * is live it hides them (and flags the SVG so useOrbitalAnimation yields
 * the label animation), restoring everything when it unmounts. That keeps
 * the page correct while the three.js chunk is still loading and if it
 * never arrives.
 *
 * Lighting comes from a real point light at the sun's position — the SVG
 * version faked this by animating each radial gradient's center.
 */

/** Set on the SVG while the 3D scene owns planets + labels. */
export const RENDERED_3D_FLAG = "data-rendered-3d";

const DEG_TO_RAD = Math.PI / 180;

const SolarSystem3D = () => {
  const size = useThree((s) => s.size);
  const groupRef = useRef<THREE.Group>(null);
  const planetRefs = useRef<(THREE.Group | null)[]>([]);
  const spinRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
  const occluderRef = useRef<THREE.Mesh>(null);
  const anglesRef = useRef<number[] | null>(null);
  const takenOverRef = useRef(false);

  const textures = useMemo(
    () => PLANET_CONFIGS.map((p) => createPlanetTexture(p.kind)),
    [],
  );
  const ringTexture = useMemo(() => createRingTexture(), []);
  const materials = useMemo(
    () =>
      textures.map(
        (map) =>
          new THREE.MeshStandardMaterial({
            map,
            roughness: 0.85,
            metalness: 0,
            transparent: true,
            opacity: 0,
          }),
      ),
    [textures],
  );
  const ringMaterial = useMemo(
    () =>
      new THREE.MeshBasicMaterial({
        map: ringTexture,
        transparent: true,
        opacity: 0,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    [ringTexture],
  );

  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose());
      ringTexture.dispose();
      materials.forEach((m) => m.dispose());
      ringMaterial.dispose();
    },
    [textures, ringTexture, materials, ringMaterial],
  );

  // Hand the planets/labels back to the SVG fallback on unmount
  useEffect(
    () => () => {
      const svg = document.getElementById(SOLAR_SYSTEM_SVG_ID);
      if (!svg) return;
      svg.removeAttribute(RENDERED_3D_FLAG);
      PLANET_CONFIGS.forEach((planet) => {
        const circle = document.getElementById(planet.id);
        if (circle) circle.style.display = "";
      });
    },
    [],
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const tracked = trackSvgById(SOLAR_SYSTEM_SVG_ID, SOLAR_SYSTEM_VIEWBOX);
    const svg = liveElementById(SOLAR_SYSTEM_SVG_ID);
    if (!tracked || !svg) {
      group.visible = false;
      takenOverRef.current = false;
      return;
    }
    group.visible = true;

    // First live frame: adopt the SVG fallback's current planet angles so
    // the swap to 3D is continuous, then take over planets + labels.
    if (!takenOverRef.current) {
      takenOverRef.current = true;
      svg.setAttribute(RENDERED_3D_FLAG, "1");
      anglesRef.current ??= PLANET_CONFIGS.map((planet) => {
        const circle = document.getElementById(
          planet.id,
        ) as SVGCircleElement | null;
        if (!circle) return 0;
        const cx = parseFloat(circle.getAttribute("cx") ?? "");
        const cy = parseFloat(circle.getAttribute("cy") ?? "");
        if (Number.isNaN(cx) || Number.isNaN(cy)) return 0;
        return (
          Math.atan2(cy - SOLAR_SYSTEM_CENTER, cx - SOLAR_SYSTEM_CENTER) /
          DEG_TO_RAD
        );
      });
      PLANET_CONFIGS.forEach((planet) => {
        const circle = document.getElementById(planet.id);
        if (circle) circle.style.display = "none";
      });
    }
    const angles = anglesRef.current;
    if (!angles) return;

    const toWorld = (vx: number, vy: number): [number, number] => [
      domToWorldX(tracked.offsetX + vx * tracked.scale, size.width),
      domToWorldY(tracked.offsetY + vy * tracked.scale, size.height),
    ];

    // Follow the SVG's fade-in (#solar-system has a 4s-delayed CSS fadeIn)
    const svgOpacity = tracked.opacity;
    const opaque = svgOpacity > 0.99;
    materials.forEach((m) => {
      m.opacity = svgOpacity;
      m.depthWrite = opaque; // let stars show through while fading in
    });
    ringMaterial.opacity = svgOpacity;

    const [sunX, sunY] = toWorld(SUN_CENTER, SUN_CENTER);
    if (lightRef.current) {
      // Slightly toward the camera so orbit-facing halves aren't pitch black
      lightRef.current.position.set(sunX, sunY, Z_BODIES + 220);
    }
    if (occluderRef.current) {
      occluderRef.current.position.set(sunX, sunY, Z_OCCLUDER);
      occluderRef.current.scale.setScalar(SUN_OCCLUDER_RADIUS * tracked.scale);
      // While the sun is still fading in, stars may shine through it —
      // culling them then would punch a star-free hole into empty black
      occluderRef.current.visible = svgOpacity > 0.5;
    }

    const deltaMs = Math.min(delta * 1000, 100);
    PLANET_CONFIGS.forEach((planet, i) => {
      // Legacy loop: angle += speed * deltaMs / 60 (degrees)
      angles[i] += (planet.speed * deltaMs) / 60;
      const angle = angles[i];
      const rad = angle * DEG_TO_RAD;
      const holder = planetRefs.current[i];
      if (holder) {
        const [x, y] = toWorld(
          SOLAR_SYSTEM_CENTER + planet.orbit * Math.cos(rad),
          SOLAR_SYSTEM_CENTER + planet.orbit * Math.sin(rad),
        );
        holder.position.set(x, y, Z_BODIES);
        holder.scale.setScalar(planet.radius * tracked.scale);
      }
      const spin = spinRefs.current[i];
      if (spin) {
        spin.rotation.y += delta * planet.spinSpeed;
      }

      // Trailing label offset along the orbit path (legacy formula)
      const label = liveElementById(`${planet.id}Label`);
      if (label) {
        const yModAnglePercent = ((angle + 270) % 360) / 360;
        label.setAttribute(
          "startOffset",
          `${(yModAnglePercent * 100 - planet.textNameOffset) % 100}%`,
        );
      }
    });
  });

  return (
    <group ref={groupRef}>
      <ambientLight intensity={0.5} />
      <pointLight ref={lightRef} intensity={2.4} decay={0} color="#fff2d9" />
      {/* Invisible depth-only disc over the SVG sun so GPU stars don't
          twinkle on top of it (the canvas sits above the landing SVG) */}
      <mesh ref={occluderRef} renderOrder={-1}>
        <circleGeometry args={[1, 32]} />
        <meshBasicMaterial colorWrite={false} />
      </mesh>
      {PLANET_CONFIGS.map((planet, i) => (
        <group
          key={planet.id}
          ref={(el) => {
            planetRefs.current[i] = el;
          }}
        >
          <group rotation={[0, 0, -planet.axialTilt]}>
            <mesh
              ref={(el) => {
                spinRefs.current[i] = el;
              }}
              material={materials[i]}
            >
              <sphereGeometry args={[1, 32, 24]} />
            </mesh>
            {planet.kind === "saturn" && (
              // Flat annulus with the ring texture, tilted out of plane
              <mesh rotation={[1.15, 0.2, 0]} material={ringMaterial}>
                <planeGeometry args={[4.4, 4.4]} />
              </mesh>
            )}
          </group>
        </group>
      ))}
    </group>
  );
};

export default SolarSystem3D;
