import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { hoverState } from "../../solarHover";
import InteractiveGlow from "./InteractiveGlow";

/**
 * The synth easter egg's front door: a little TR-808-style drum machine
 * floating among the link bodies on /home — charcoal slab, 4x4 grid of
 * red/orange/yellow/cream pads, a row of knobs, a blinking status LED.
 * Clicking its overlay (SolarOverlays) warps to the synth solar system.
 * Reuses the asteroid link plumbing: same config shape, BodyAnchors
 * overlay, hover freeze/brighten/outline, landing fade.
 *
 * Orientation: like the rocket, the rig re-derives its basis every
 * frame so the pad face tips toward the camera (blended with world-up,
 * so it reads like a product shot rather than a billboard), and the
 * body sways a few degrees instead of tumbling — you can always see the
 * pads.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;
const HOVER_EMISSIVE = 0.55;

/** Classic 808 pad-row colors, front row to back. Local -z is the front
 *  edge (the rig maps +z up-screen, away from the viewer). */
const PAD_ROW_COLORS = ["#ff4d4d", "#ff9d3c", "#ffd23f", "#f2f0e9"];
const PAD_COLS = [-0.57, -0.19, 0.19, 0.57];
const PAD_ROWS = [-0.46, -0.18, 0.1, 0.38];
const KNOB_XS = [-0.66, -0.22, 0.22, 0.66];

const BLINK_PERIOD_SECONDS = 1.4;
const BLINK_ON_FRACTION = 0.65;

const UP = new THREE.Vector3(0, 1, 0);

// scratch values, reused every frame
const topDir = new THREE.Vector3();
const backEdge = new THREE.Vector3();
const sideAxis = new THREE.Vector3();
const basis = new THREE.Matrix4();

export default function DrumPad({
  config,
  visible = true,
}: {
  config: SolarPlanetConfig;
  visible?: boolean;
}) {
  const group = useRef<THREE.Group>(null); // orbit position + fade
  const rig = useRef<THREE.Group>(null); // face-to-camera basis
  const body = useRef<THREE.Group>(null); // sways around the face axis
  const led = useRef<THREE.Mesh>(null);
  const opacity = useRef(visible ? 1 : 0);
  // Out-of-band so the first frame always initializes the materials
  const appliedOpacity = useRef(-1);
  const swayPhase = useRef(0);
  const bobPhase = useRef(0);

  const materials = useMemo(
    () => ({
      chassis: new THREE.MeshStandardMaterial({
        color: "#2a2e35",
        metalness: 0.35,
        roughness: 0.55,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      pads: PAD_ROW_COLORS.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color,
            metalness: 0.1,
            roughness: 0.5,
            emissive: "#ffffff",
            emissiveIntensity: 0,
            transparent: true,
          }),
      ),
      knob: new THREE.MeshStandardMaterial({
        color: "#cfd6dd",
        metalness: 0.8,
        roughness: 0.35,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      led: new THREE.MeshBasicMaterial({
        color: "#ff5252",
        transparent: true,
      }),
    }),
    [],
  );
  useEffect(
    () => () => {
      materials.pads.forEach((material) => material.dispose());
      materials.chassis.dispose();
      materials.knob.dispose();
      materials.led.dispose();
    },
    [materials],
  );

  const allMaterials = useMemo(
    () => [materials.chassis, ...materials.pads, materials.knob, materials.led],
    [materials],
  );

  // Meshes that feed the hover silhouette (everything solid)
  const outlineMeshes = useRef<THREE.Mesh[]>([]);
  const registerOutlineMesh = (mesh: THREE.Mesh | null) => {
    if (mesh && !outlineMeshes.current.includes(mesh)) {
      outlineMeshes.current.push(mesh);
    }
  };

  useFrame(({ clock, camera, size }, delta) => {
    const t = clock.elapsedTime;
    const hovered = hoverState.asteroid === config.name;

    if (!hovered) {
      swayPhase.current += delta * 0.5;
      bobPhase.current += delta * 1.1;
    }

    if (group.current) {
      planetPosition(config, t, group.current.position);
      group.current.position.y += Math.sin(bobPhase.current) * 0.06;

      // Same landing-view fade as the asteroids
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      if (opacity.current !== appliedOpacity.current) {
        appliedOpacity.current = opacity.current;
        group.current.visible = opacity.current > 0.005;
        allMaterials.forEach((material) => {
          material.opacity = opacity.current;
        });
      }
    }

    // Tip the pad face toward the camera, blended with world-up so it
    // reads three-quarter rather than dead-on; the back edge stays
    // up-screen. Skip the update when the camera sits right on the face
    // normal (the landing top-down pose) — the basis would degenerate.
    if (rig.current && group.current) {
      topDir
        .copy(camera.position)
        .sub(group.current.position)
        .normalize()
        .addScaledVector(UP, 0.35)
        .normalize();
      backEdge.copy(UP).addScaledVector(topDir, -UP.dot(topDir));
      if (backEdge.lengthSq() > 1e-3) {
        backEdge.normalize();
        sideAxis.crossVectors(topDir, backEdge);
        basis.makeBasis(sideAxis, topDir, backEdge);
        rig.current.quaternion.setFromRotationMatrix(basis);
      }
    }

    if (body.current) {
      body.current.rotation.y = 0.3 * Math.sin(swayPhase.current);
    }

    // Status LED blink (frozen look doesn't matter — it's tiny)
    if (led.current) {
      led.current.visible =
        t % BLINK_PERIOD_SECONDS < BLINK_PERIOD_SECONDS * BLINK_ON_FRACTION;
    }

    // Hover: wash toward white, same treatment as the other link bodies
    const ease = Math.min(delta * 6, 1);
    materials.chassis.emissiveIntensity +=
      ((hovered ? HOVER_EMISSIVE : 0) - materials.chassis.emissiveIntensity) *
      ease;
    materials.pads.forEach((material) => {
      material.emissiveIntensity = materials.chassis.emissiveIntensity;
    });
    materials.knob.emissiveIntensity = materials.chassis.emissiveIntensity;

    if (hovered) {
      writeSilhouette(
        asteroidOutlineId(config.name),
        outlineMeshes.current,
        camera,
        size,
      );
    }
  });

  return (
    <group ref={group}>
      {/* Clickable-body halo, same as the link asteroids: the pad is the
          only door to the synth studio, so it should read as clickable.
          Outside the rig so config.radius isn't applied twice. */}
      <InteractiveGlow radius={config.radius} opacityRef={opacity} />
      <group ref={rig} scale={config.radius}>
        <group ref={body}>
          <mesh ref={registerOutlineMesh} material={materials.chassis}>
            <boxGeometry args={[1.9, 0.5, 1.3]} />
          </mesh>
          {/* 4x4 pad grid on the top face, one classic color per row */}
          {PAD_ROWS.map((z, row) =>
            PAD_COLS.map((x) => (
              <mesh
                key={`${row}-${x}`}
                ref={registerOutlineMesh}
                material={materials.pads[row]}
                position={[x, 0.28, z]}
              >
                <boxGeometry args={[0.3, 0.08, 0.2]} />
              </mesh>
            )),
          )}
          {/* Knob row along the back edge */}
          {KNOB_XS.map((x) => (
            <mesh
              key={x}
              ref={registerOutlineMesh}
              material={materials.knob}
              position={[x, 0.31, 0.56]}
            >
              <cylinderGeometry args={[0.09, 0.09, 0.12, 12]} />
            </mesh>
          ))}
          {/* Blinking status LED, front-right corner */}
          <mesh
            ref={led}
            material={materials.led}
            position={[0.8, 0.29, -0.56]}
          >
            <sphereGeometry args={[0.06, 10, 8]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
