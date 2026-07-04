import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { createLogoBadgeTexture } from "../textures";
import { hoverState } from "../../solarHover";

/**
 * The GitHub link body: a Sputnik-style satellite — a polished metal
 * sphere trailing a cone of four antenna "legs", with a blinking beacon
 * on top of the head. It reuses the asteroid link plumbing (BodyAnchors
 * overlay, hover freeze/brighten/outline, landing fade) via the same
 * config.
 *
 * Orientation: the home camera co-rotates with Earth's orbit, so a fixed
 * world heading would slowly wheel around on screen. The rig therefore
 * re-aims the leg cone every frame at the frame's screen-right (the same
 * `side` vector CameraRig steers with), and the body's only motion is a
 * slow roll about that leg axis — the cone spins in place, so the legs
 * always point right. The beacon hangs off the rig, not the rolling
 * body, so it stays on top of the head.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;

const LEG_COUNT = 4;
const LEG_TILT = 0.32; // radians each leg splays off the cone axis
const BLINK_PERIOD_SECONDS = 1.2;
const BLINK_ON_FRACTION = 0.55;
const HOVER_EMISSIVE = 0.9;

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const earthPos = new THREE.Vector3();
const legsDir = new THREE.Vector3();
const camDir = new THREE.Vector3();

export default function Satellite({
  config,
  visible = true,
}: {
  config: SolarPlanetConfig;
  visible?: boolean;
}) {
  const group = useRef<THREE.Group>(null); // orbit position + fade
  const rig = useRef<THREE.Group>(null); // aims the leg cone screen-right
  const body = useRef<THREE.Group>(null); // rolls about the leg axis
  const bulb = useRef<THREE.Mesh>(null);
  const badge = useRef<THREE.Mesh>(null);
  const opacity = useRef(visible ? 1 : 0);
  const roll = useRef(0);

  const bodyRadius = config.radius * 0.8;
  const legLength = config.radius * 2.6;

  const materials = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({
        color: "#dfe4ea",
        metalness: 0.85,
        roughness: 0.3,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      leg: new THREE.MeshStandardMaterial({
        color: "#aab2bc",
        metalness: 0.8,
        roughness: 0.45,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      bulb: new THREE.MeshBasicMaterial({
        color: "#ff5252",
        transparent: true,
      }),
      badge: new THREE.MeshBasicMaterial({
        map: createLogoBadgeTexture("github"),
        transparent: true,
        alphaTest: 0.5,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      materials.badge.map?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  // The antenna cone: thin rods splayed LEG_TILT off local +Z, evenly
  // spaced around it, attached just aft of the sphere's surface
  const legs = useMemo(
    () =>
      Array.from({ length: LEG_COUNT }, (_, i) => {
        const around = (i / LEG_COUNT) * Math.PI * 2 + Math.PI / 4;
        const direction = new THREE.Vector3(
          Math.sin(LEG_TILT) * Math.cos(around),
          Math.sin(LEG_TILT) * Math.sin(around),
          Math.cos(LEG_TILT),
        );
        return {
          position: direction
            .clone()
            .multiplyScalar(bodyRadius * 0.7 + legLength / 2),
          quaternion: new THREE.Quaternion().setFromUnitVectors(
            Y_AXIS,
            direction,
          ),
        };
      }),
    [bodyRadius, legLength],
  );

  useFrame(({ clock, camera, size }, delta) => {
    const t = clock.elapsedTime;
    const hovered = hoverState.asteroid === config.name;

    if (group.current) {
      planetPosition(config, t, group.current.position);

      // Same landing-view fade as the asteroids
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      group.current.visible = opacity.current > 0.005;
      materials.body.opacity = opacity.current;
      materials.leg.opacity = opacity.current;
      materials.bulb.opacity = opacity.current;
      materials.badge.opacity = opacity.current;
    }

    // Point the leg cone at the co-rotating frame's screen-right (the
    // rotation Z->side is about +Y, so the beacon stays world-up)
    if (rig.current) {
      planetPosition(EARTH, t, earthPos);
      legsDir.copy(earthPos).normalize().cross(UP).normalize();
      rig.current.quaternion.setFromUnitVectors(Z_AXIS, legsDir);
    }

    // Slow roll about the leg axis — the cone spins in place, legs never
    // leave screen-right. Frozen while hovered, like the asteroid spins.
    if (body.current) {
      if (!hovered) roll.current += delta * Math.abs(config.spinSpeed);
      body.current.rotation.z = roll.current;
    }

    // Beacon blink (hard on/off reads as a status light)
    if (bulb.current) {
      bulb.current.visible =
        t % BLINK_PERIOD_SECONDS < BLINK_PERIOD_SECONDS * BLINK_ON_FRACTION;
    }

    // GitHub badge rides the camera-facing side of the sphere, upright
    if (badge.current && group.current) {
      camDir.copy(camera.position).sub(group.current.position).normalize();
      badge.current.position.copy(camDir).multiplyScalar(bodyRadius * 1.12);
      badge.current.quaternion.copy(camera.quaternion);
    }

    // Hover: wash the metal out toward white (badge/bulb unaffected)
    const ease = Math.min(delta * 6, 1);
    materials.body.emissiveIntensity +=
      ((hovered ? HOVER_EMISSIVE : 0) - materials.body.emissiveIntensity) *
      ease;
    materials.leg.emissiveIntensity = materials.body.emissiveIntensity;

    // Hover: hand the satellite's silhouette to the overlay outline
    if (hovered && rig.current) {
      const meshes: THREE.Mesh[] = [];
      rig.current.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) meshes.push(obj as THREE.Mesh);
      });
      writeSilhouette(asteroidOutlineId(config.name), meshes, camera, size);
    }
  });

  return (
    <group ref={group}>
      <group ref={rig}>
        <group ref={body}>
          <mesh material={materials.body}>
            <sphereGeometry args={[bodyRadius, 24, 16]} />
          </mesh>
          {legs.map((leg, i) => (
            <mesh
              key={i}
              material={materials.leg}
              position={leg.position}
              quaternion={leg.quaternion}
            >
              {/* tapered: thick at the attach point, thin at the tip */}
              <cylinderGeometry
                args={[bodyRadius * 0.05, bodyRadius * 0.1, legLength, 6]}
              />
            </mesh>
          ))}
        </group>
        {/* Blinking beacon on top of the head — outside the rolling body
            so "top" holds still while the legs spin */}
        <mesh
          ref={bulb}
          material={materials.bulb}
          position={[0, bodyRadius * 1.05, 0]}
        >
          <sphereGeometry args={[bodyRadius * 0.15, 12, 8]} />
        </mesh>
      </group>
      <mesh ref={badge} material={materials.badge}>
        <planeGeometry args={[bodyRadius * 1.15, bodyRadius * 1.15]} />
      </mesh>
    </group>
  );
}
