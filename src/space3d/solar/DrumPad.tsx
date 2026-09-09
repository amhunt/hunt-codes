import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { applyWireSkin } from "./wireSkin";

import {
  planetPosition,
  SATELLITE,
  synthPadState,
  type SolarPlanetConfig,
} from "./constants";
import { viewGoal } from "./CameraRig";
import { asteroidOutlineId } from "../../solarAnchorIds";
import { writeSilhouette } from "./outline";
import { hoverState } from "../../solarHover";
import InteractiveGlow from "./InteractiveGlow";

/**
 * The synth easter egg's front door: a little TR-808-style drum machine
 * floating beside the Sputnik satellite in the /projects-and-toys
 * close-up — charcoal slab, 4x4 grid of red/orange/yellow/cream pads, a
 * row of knobs, a blinking status LED. Clicking its overlay
 * (ProjectsAndToys) warps to the synth solar system. Reuses the asteroid
 * link plumbing: BodyAnchors overlay, hover freeze/brighten/outline, and
 * the landing-style fade — it fades in along the arrival swoop from
 * /home and out on the way back.
 *
 * Placement: it isn't an orbiting body. Each frame it sits at the
 * satellite's depth in the close-up camera's GOAL frame (CameraRig's
 * viewGoal), offset across that frame by PAD_NDC_X/Y, so it holds a
 * fixed world spot beside the satellite (riding its orbit), stays in
 * frame at every aspect, and the swoop reveals it rather than dragging
 * it along. It publishes that spot (synthPadState) for its overlay and
 * for the synth transit's boarding beat.
 *
 * Orientation: like the rocket, the rig re-derives its basis every
 * frame so the pad face tips toward the camera (blended with world-up,
 * so it reads like a product shot rather than a billboard), and the
 * body sways a few degrees instead of tumbling — you can always see the
 * pads.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;
/** The pad floats on the shadowed side of the close-up (the sun sits
 *  below the frame, so the sun lights its underside and the pads face
 *  the dark), so like the satellite's pen and vase it glows in its own
 *  colors: each material's emissive is its own color, at BASE resting
 *  and HOVER when hovered. The chassis glows a lighter slate than its
 *  paint so it reads as a slab, not a hole. */
const BASE_EMISSIVE = 0.55;
const HOVER_EMISSIVE = 1.4;
const CHASSIS_BASE_EMISSIVE = 0.35;
const CHASSIS_HOVER_EMISSIVE = 0.9;
const CHASSIS_GLOW = "#5a6170";

/** Where the pad floats in the close-up, as fractions of the frame's
 *  half-width / half-height at the satellite's depth: left of the head
 *  and a little above center — the upper left is the corner the
 *  composition leaves free (the antenna cone reaches right, the sun's
 *  limb rides the bottom left, the caption sits bottom right). */
const PAD_NDC_X = -0.7;
const PAD_NDC_Y = 0.28;
/** Idle bob amplitude, as a fraction of the pad's radius */
const BOB_RADII = 0.15;

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
const goalPos = new THREE.Vector3();
const goalLook = new THREE.Vector3();
const goalRight = new THREE.Vector3();
const goalUp = new THREE.Vector3();
const goalForward = new THREE.Vector3();
const goalMatrix = new THREE.Matrix4();
const satPos = new THREE.Vector3();
const topDir = new THREE.Vector3();
const backEdge = new THREE.Vector3();
const sideAxis = new THREE.Vector3();
const basis = new THREE.Matrix4();

export default function DrumPad({
  config,
  visible = true,
}: {
  /** Name (its overlay/hover id) and radius (its chassis + halo scale) */
  config: Pick<SolarPlanetConfig, "name" | "radius">;
  visible?: boolean;
}) {
  const group = useRef<THREE.Group>(null); // placement + fade
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
        emissive: CHASSIS_GLOW,
        emissiveIntensity: CHASSIS_BASE_EMISSIVE,
        transparent: true,
      }),
      pads: PAD_ROW_COLORS.map(
        (color) =>
          new THREE.MeshStandardMaterial({
            color,
            metalness: 0.1,
            roughness: 0.5,
            emissive: color,
            emissiveIntensity: BASE_EMISSIVE,
            transparent: true,
          }),
      ),
      knob: new THREE.MeshStandardMaterial({
        color: "#cfd6dd",
        metalness: 0.8,
        roughness: 0.35,
        emissive: "#cfd6dd",
        emissiveIntensity: BASE_EMISSIVE * 0.6,
        transparent: true,
      }),
      led: new THREE.MeshBasicMaterial({
        color: "#ff5252",
        transparent: true,
      }),
    }),
    [],
  );
  // Mesh view's wire skin. The 16 pads keep their row colors as wire
  // tints — they're the only door to /synth, and at this size the rows
  // are told apart by color alone. The LED sits it out: it's a lamp, and
  // MeshBasic has no `totalEmissiveRadiance` for the hover term. Boxy
  // hardware takes the cartesian lattice (lat/long lines converged on
  // each box's centre and read as a web); pitches are in the geometry's
  // own units — the rig scales to config.radius.
  // A fifth of the pad's own shading shows through under the wires
  // (wireSkin `keep`), so it reads as a translucent 808 rather than a
  // bare lattice.
  useMemo(() => {
    const keep = 0.2;
    applyWireSkin(materials.chassis, {
      grid: "box",
      pitch: 0.2,
      hover: true,
      keep,
    });
    applyWireSkin(materials.knob, {
      grid: "box",
      pitch: 0.06,
      hover: true,
      keep,
    });
    materials.pads.forEach((material, i) =>
      applyWireSkin(material, {
        grid: "box",
        pitch: 0.1,
        hover: true,
        keep,
        tint: PAD_ROW_COLORS[i],
      }),
    );
  }, [materials]);

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
      // Anchor to the close-up framing (see PAD_NDC_*): the goal camera's
      // frame, at the satellite's depth along its forward axis
      viewGoal("projects", t, camera, size, goalPos, goalLook);
      goalMatrix.lookAt(goalPos, goalLook, UP);
      goalRight.setFromMatrixColumn(goalMatrix, 0);
      goalUp.setFromMatrixColumn(goalMatrix, 1);
      goalForward.setFromMatrixColumn(goalMatrix, 2).negate();
      planetPosition(SATELLITE, t, satPos);
      const depth = satPos.sub(goalPos).dot(goalForward);
      const persp = camera as THREE.PerspectiveCamera;
      const tanHalfV = Math.tan((persp.fov * Math.PI) / 360);
      const tanHalfH = tanHalfV * (persp.aspect || 1);
      group.current.position
        .copy(goalPos)
        .addScaledVector(goalForward, depth)
        .addScaledVector(goalRight, PAD_NDC_X * depth * tanHalfH)
        .addScaledVector(goalUp, PAD_NDC_Y * depth * tanHalfV);
      group.current.position.y +=
        Math.sin(bobPhase.current) * config.radius * BOB_RADII;
      synthPadState.position.copy(group.current.position);

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

    // Hover: turn the self-glow up, same treatment as the pen and vase
    const ease = Math.min(delta * 6, 1);
    const glowTo = (material: THREE.MeshStandardMaterial, target: number) => {
      material.emissiveIntensity +=
        (target - material.emissiveIntensity) * ease;
    };
    glowTo(
      materials.chassis,
      hovered ? CHASSIS_HOVER_EMISSIVE : CHASSIS_BASE_EMISSIVE,
    );
    const padGlow = hovered ? HOVER_EMISSIVE : BASE_EMISSIVE;
    materials.pads.forEach((material) => glowTo(material, padGlow));
    glowTo(materials.knob, padGlow * 0.6);

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
