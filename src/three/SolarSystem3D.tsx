import React, { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";

import { createPlanetTexture, createRingTexture, type PlanetKind } from "./textures";
import { domToWorldX, domToWorldY, Z_BODIES, Z_OCCLUDER } from "./SpaceCanvas";

/**
 * 3D planets for the landing solar system. The sun, orbit paths and the
 * trailing text labels stay in the Landing SVG (the sun holds the "enter"
 * link); this scene tracks the SVG's on-screen box every frame and renders
 * the planets in the same coordinate space, so the two layers stay glued.
 *
 * Lighting comes from a real point light at the sun's position — the SVG
 * version faked this by animating each radial gradient's center.
 */

const SVG_ID = "solar-system";
const VIEWBOX_SIZE = 600;
const CENTER = 300;
// SunInternals(size=0.25, radiusOffset=243): disc center ~(293, 294), r ~44
const SUN_CENTER_X = 293;
const SUN_CENTER_Y = 294;
const SUN_RADIUS = 47;

// Same orbits/speeds as the legacy PLANET_CONFIGS in useOrbitalAnimation
interface PlanetConfig {
  id: string;
  orbit: number;
  speed: number;
  radius: number;
  kind: PlanetKind;
  textNameOffset: number;
  spinSpeed: number;
  axialTilt: number;
}

const PLANETS: PlanetConfig[] = [
  { id: "planet1", orbit: 100, speed: 2, radius: 4, kind: "mars", textNameOffset: 30, spinSpeed: 0.5, axialTilt: 0.1 },
  { id: "planet2", orbit: 160, speed: 1.8, radius: 8, kind: "neptune", textNameOffset: 28.5, spinSpeed: 0.35, axialTilt: 0.25 },
  { id: "planet3", orbit: 200, speed: 1.9, radius: 6, kind: "saturn", textNameOffset: 28.25, spinSpeed: 0.45, axialTilt: 0.45 },
  { id: "planet4", orbit: 240, speed: 1.4, radius: 5, kind: "ice", textNameOffset: 27.4, spinSpeed: 0.3, axialTilt: 0.2 },
];

const DEG_TO_RAD = Math.PI / 180;

const SolarSystem3D = () => {
  const size = useThree((s) => s.size);
  const groupRef = useRef<THREE.Group>(null);
  const planetRefs = useRef<(THREE.Group | null)[]>([]);
  const spinRefs = useRef<(THREE.Mesh | null)[]>([]);
  const lightRef = useRef<THREE.PointLight>(null);
  const occluderRef = useRef<THREE.Mesh>(null);
  const anglesRef = useRef<number[]>(PLANETS.map(() => 0));

  const textures = useMemo(
    () => PLANETS.map((p) => createPlanetTexture(p.kind)),
    []
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
          })
      ),
    [textures]
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
    [ringTexture]
  );

  useEffect(
    () => () => {
      textures.forEach((t) => t.dispose());
      ringTexture.dispose();
      materials.forEach((m) => m.dispose());
      ringMaterial.dispose();
    },
    [textures, ringTexture, materials, ringMaterial]
  );

  useFrame((_, delta) => {
    const group = groupRef.current;
    if (!group) return;
    const svg = document.getElementById(SVG_ID);
    if (!svg) {
      group.visible = false;
      return;
    }
    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      group.visible = false;
      return;
    }
    group.visible = true;

    // viewBox -> CSS px (preserveAspectRatio="xMidYMid meet")
    const scale = Math.min(rect.width, rect.height) / VIEWBOX_SIZE;
    const offsetX = rect.left + (rect.width - VIEWBOX_SIZE * scale) / 2;
    const offsetY = rect.top + (rect.height - VIEWBOX_SIZE * scale) / 2;
    const toWorld = (vx: number, vy: number): [number, number] => [
      domToWorldX(offsetX + vx * scale, size.width),
      domToWorldY(offsetY + vy * scale, size.height),
    ];

    // Follow the SVG's fade-in (#solar-system has a 4s-delayed CSS fadeIn)
    const svgOpacity = parseFloat(getComputedStyle(svg).opacity) || 0;
    const opaque = svgOpacity > 0.99;
    materials.forEach((m) => {
      m.opacity = svgOpacity;
      m.depthWrite = opaque; // let stars show through while fading in
    });
    ringMaterial.opacity = svgOpacity;

    const [sunX, sunY] = toWorld(SUN_CENTER_X, SUN_CENTER_Y);
    if (lightRef.current) {
      // Slightly toward the camera so orbit-facing halves aren't pitch black
      lightRef.current.position.set(sunX, sunY, Z_BODIES + 220);
    }
    if (occluderRef.current) {
      occluderRef.current.position.set(sunX, sunY, Z_OCCLUDER);
      occluderRef.current.scale.setScalar(SUN_RADIUS * scale);
    }

    const deltaMs = Math.min(delta * 1000, 100);
    PLANETS.forEach((planet, i) => {
      // Legacy loop: angle += speed * deltaMs / 60 (degrees)
      anglesRef.current[i] += (planet.speed * deltaMs) / 60;
      const angle = anglesRef.current[i];
      const rad = angle * DEG_TO_RAD;
      const holder = planetRefs.current[i];
      if (holder) {
        const [x, y] = toWorld(
          CENTER + planet.orbit * Math.cos(rad),
          CENTER + planet.orbit * Math.sin(rad)
        );
        holder.position.set(x, y, Z_BODIES);
        holder.scale.setScalar(planet.radius * scale);
      }
      const spin = spinRefs.current[i];
      if (spin) {
        spin.rotation.y += delta * planet.spinSpeed;
      }

      // Trailing label offset along the orbit path (legacy formula)
      const label = document.getElementById(`${planet.id}Label`);
      if (label) {
        const yModAnglePercent = ((angle + 270) % 360) / 360;
        label.setAttribute(
          "startOffset",
          `${(yModAnglePercent * 100 - planet.textNameOffset) % 100}%`
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
      {PLANETS.map((planet, i) => (
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
