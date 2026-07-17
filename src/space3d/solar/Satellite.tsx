import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import { EARTH, planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { createLogoBadgeTexture } from "../textures";
import { hoverState } from "../../solarHover";
import InteractiveGlow from "./InteractiveGlow";

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
 *
 * The GitHub badge is a trio of decals evenly spaced around the sphere
 * (the same sticker treatment as the asteroids), glued to the rolling
 * body so the marks turn with the spin.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;

const LEG_COUNT = 4;
const LEG_TILT = 0.32; // radians each leg splays off the cone axis
const BLINK_PERIOD_SECONDS = 1.2;
const BLINK_ON_FRACTION = 0.55;
const HOVER_EMISSIVE = 0.9;
/** Slow the body roll well below the config spin (a stately tumble) */
const ROLL_SPEED_SCALE = 0.35;
/** Badges every 120° around the roll circumference */
const BADGE_ANGLES = [0, (2 * Math.PI) / 3, (4 * Math.PI) / 3];

const Z_AXIS = new THREE.Vector3(0, 0, 1);
const Y_AXIS = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const earthPos = new THREE.Vector3();
const legsDir = new THREE.Vector3();

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
      // Same decal treatment as the asteroids: unlit so the mark stays
      // legible on the dark side, polygonOffset floats it off the faces
      badge: new THREE.MeshBasicMaterial({
        map: createLogoBadgeTexture("github"),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
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

  const bodyGeometry = useMemo(
    () => new THREE.SphereGeometry(bodyRadius, 24, 16),
    [bodyRadius],
  );
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // Badge decals evenly spaced around the roll circumference (the plane
  // perpendicular to local Z, the leg cone) so a mark sweeps past the
  // camera every third of a roll. Because each projector is the same base
  // pose spun about the roll axis, ALL badges show the same orientation
  // at the moment they face the camera — and the unflipped base reads
  // upside down there, so the base pose carries a 180° texture roll.
  const badgeGeometries = useMemo(() => {
    const target = new THREE.Mesh(bodyGeometry);
    const size = new THREE.Vector3(
      bodyRadius * 1.4,
      bodyRadius * 1.4,
      bodyRadius * 1.1,
    );
    // Look from +X toward the center, texture rolled 180°
    const basePose = new THREE.Quaternion()
      .setFromAxisAngle(Y_AXIS, Math.PI / 2)
      .multiply(new THREE.Quaternion().setFromAxisAngle(Z_AXIS, Math.PI));
    return BADGE_ANGLES.map((angle) => {
      const pose = new THREE.Quaternion()
        .setFromAxisAngle(Z_AXIS, angle)
        .multiply(basePose);
      return new DecalGeometry(
        target,
        new THREE.Vector3(
          Math.cos(angle) * bodyRadius,
          Math.sin(angle) * bodyRadius,
          0,
        ),
        new THREE.Euler().setFromQuaternion(pose),
        size,
      );
    });
  }, [bodyGeometry, bodyRadius]);
  useEffect(
    () => () => badgeGeometries.forEach((g) => g.dispose()),
    [badgeGeometries],
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
    // The badge decals are children of the body, so they roll along.
    if (body.current) {
      if (!hovered) {
        roll.current += delta * Math.abs(config.spinSpeed) * ROLL_SPEED_SCALE;
      }
      body.current.rotation.z = roll.current;
    }

    // Beacon blink (hard on/off reads as a status light)
    if (bulb.current) {
      bulb.current.visible =
        t % BLINK_PERIOD_SECONDS < BLINK_PERIOD_SECONDS * BLINK_ON_FRACTION;
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
      {/* clickable-body affordance halo, riding the landing fade */}
      <InteractiveGlow radius={config.radius} opacityRef={opacity} />
      <group ref={rig}>
        <group ref={body}>
          <mesh material={materials.body} geometry={bodyGeometry} />
          {/* GitHub badge stickers, rolling with the body */}
          {badgeGeometries.map((badgeGeometry, i) => (
            <mesh key={i} geometry={badgeGeometry} material={materials.badge} />
          ))}
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
    </group>
  );
}
