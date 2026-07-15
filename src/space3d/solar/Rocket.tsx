import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, planetPosition, type SolarPlanetConfig } from "./constants";
import { asteroidOutlineId } from "./BodyAnchors";
import { writeSilhouette } from "./outline";
import { hoverState } from "../../solarHover";

/**
 * The "surprise me" easter egg: a cartoon steel rocket with red and
 * purple trim that floats among the link asteroids. It reuses the
 * asteroid link plumbing (BodyAnchors overlay, hover freeze/brighten/
 * outline, landing fade) via the same config; clicking its overlay
 * launches the lightspeed joyride (RocketJourney).
 *
 * Orientation: like the satellite, the home camera co-rotates with
 * Earth's orbit, so the rig re-derives its basis every frame in that
 * frame — the nose leans toward the frame's screen-right (climbing
 * diagonally, flame trailing down-left) and the hull is rolled so the
 * porthole faces the camera. The inner body sways a few degrees around
 * that roll instead of spinning through, keeping the window in view.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;
const HOVER_EMISSIVE = 0.7;

/** Sideways lean of the nose off world-up, in the co-rotating frame */
const ROCKET_NOSE_LEAN = 0.85;

const UP = new THREE.Vector3(0, 1, 0);
const noseEarth = new THREE.Vector3();

/** Fin yaws: three swept fins, offset so none points straight at the
 *  camera (which would hide the hull behind a fin-on edge) */
const FIN_YAWS = [0, 1, 2].map((i) => Math.PI / 6 + (i * 2 * Math.PI) / 3);

/** The rocket's nose (travel) direction at time t — shared with
 *  RocketJourney so the boarding swoop lines up behind the ship. */
export function rocketNoseDirection(
  t: number,
  out: THREE.Vector3,
): THREE.Vector3 {
  planetPosition(EARTH, t, noseEarth);
  out.copy(noseEarth).normalize().cross(UP).multiplyScalar(ROCKET_NOSE_LEAN);
  out.y += 1;
  return out.normalize();
}

// scratch values, reused every frame
const nose = new THREE.Vector3();
const toCamera = new THREE.Vector3();
const rollAxis = new THREE.Vector3();
const basis = new THREE.Matrix4();

export default function Rocket({
  config,
  visible = true,
}: {
  config: SolarPlanetConfig;
  visible?: boolean;
}) {
  const group = useRef<THREE.Group>(null); // orbit position + fade
  const rig = useRef<THREE.Group>(null); // nose-up, window-to-camera basis
  const body = useRef<THREE.Group>(null); // sways around the roll axis
  const flameOuter = useRef<THREE.Mesh>(null);
  const flameInner = useRef<THREE.Mesh>(null);
  const opacity = useRef(visible ? 1 : 0);
  // Out-of-band so the first frame always initializes the materials
  // (JSX materials mount at opacity 1 regardless of the fade state)
  const appliedOpacity = useRef(-1);
  // Sway/bob phases advance only while un-hovered, freezing the pose
  // under the silhouette outline (same trick as the asteroid spins)
  const swayPhase = useRef(0);
  const bobPhase = useRef(0);

  const materials = useMemo(
    () => ({
      steel: new THREE.MeshStandardMaterial({
        color: "#ccd3da",
        metalness: 0.85,
        roughness: 0.32,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      steelDark: new THREE.MeshStandardMaterial({
        color: "#6d757e",
        metalness: 0.9,
        roughness: 0.4,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      red: new THREE.MeshStandardMaterial({
        color: "#ff5252",
        metalness: 0.3,
        roughness: 0.45,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      purple: new THREE.MeshStandardMaterial({
        color: "#9e80f9",
        metalness: 0.4,
        roughness: 0.4,
        emissive: "#ffffff",
        emissiveIntensity: 0,
        transparent: true,
      }),
      // Glossy dark porthole with a fixed blue sheen (kept out of the
      // hover wash so it still reads as glass)
      glass: new THREE.MeshStandardMaterial({
        color: "#131b36",
        metalness: 0.1,
        roughness: 0.15,
        emissive: "#3a56c4",
        emissiveIntensity: 0.35,
        transparent: true,
      }),
      // Unlit flames so the exhaust glows on the sun-shadowed side too
      flameOuter: new THREE.MeshBasicMaterial({
        color: "#ff9d3c",
        transparent: true,
      }),
      flameInner: new THREE.MeshBasicMaterial({
        color: "#ffe066",
        transparent: true,
      }),
    }),
    [],
  );
  useEffect(
    () => () =>
      Object.values(materials).forEach((material) => material.dispose()),
    [materials],
  );

  // Cartoon fuselage: a lathe profile (r, y) in nose-axis units — round
  // tail, gentle belly bulge, shoulder for the nose cone to sit on
  const fuselageGeometry = useMemo(() => {
    const profile = [
      [0.001, -0.78],
      [0.26, -0.74],
      [0.4, -0.46],
      [0.46, -0.1],
      [0.44, 0.28],
      [0.34, 0.62],
      [0.28, 0.74],
    ].map(([r, y]) => new THREE.Vector2(r, y));
    return new THREE.LatheGeometry(profile, 24);
  }, []);
  useEffect(() => () => fuselageGeometry.dispose(), [fuselageGeometry]);

  // Swept cartoon fin (in the rocket's XY plane, extruded through Z):
  // hugs the hull at x~0.3, swoops out and down to a trailing point
  const finGeometry = useMemo(() => {
    const shape = new THREE.Shape();
    shape.moveTo(0.3, 0.1);
    shape.quadraticCurveTo(0.92, -0.18, 1.02, -0.88);
    shape.quadraticCurveTo(0.78, -0.68, 0.46, -0.62);
    shape.lineTo(0.3, -0.66);
    shape.closePath();
    const geo = new THREE.ExtrudeGeometry(shape, {
      depth: 0.09,
      bevelEnabled: true,
      bevelThickness: 0.02,
      bevelSize: 0.02,
      bevelSegments: 1,
    });
    geo.translate(0, 0, -0.045 - 0.02);
    return geo;
  }, []);
  useEffect(() => () => finGeometry.dispose(), [finGeometry]);

  // Meshes that feed the hover silhouette — everything except the
  // flickering flames, which would make the outline shimmer
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
      swayPhase.current += delta * 0.55;
      bobPhase.current += delta * 1.2;
    }

    if (group.current) {
      planetPosition(config, t, group.current.position);
      // Gentle idle bob (small enough that the overlay anchor, glued to
      // the un-bobbed orbit position, still covers the ship)
      group.current.position.y += Math.sin(bobPhase.current) * 0.07;

      // Same landing-view fade as the asteroids
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      if (opacity.current !== appliedOpacity.current) {
        appliedOpacity.current = opacity.current;
        group.current.visible = opacity.current > 0.005;
        Object.values(materials).forEach((material) => {
          material.opacity = opacity.current;
        });
      }
    }

    // Re-derive the rig basis in the co-rotating frame: local +Y along
    // the nose, local +Z rolled toward the camera so the porthole shows.
    // When the camera sits nearly ON the nose axis (the end of the
    // boarding swoop parks it exactly there), the perpendicular becomes
    // noise and the roll would pinwheel — hold the last stable pose.
    if (rig.current && group.current) {
      rocketNoseDirection(t, nose);
      toCamera.copy(camera.position).sub(group.current.position);
      toCamera.addScaledVector(nose, -toCamera.dot(nose));
      if (toCamera.lengthSq() > 0.06) {
        toCamera.normalize();
        rollAxis.crossVectors(nose, toCamera);
        basis.makeBasis(rollAxis, nose, toCamera);
        rig.current.quaternion.setFromRotationMatrix(basis);
      }
    }

    // Sway a few degrees around the roll axis instead of spinning
    // through — the window stays mostly camera-side
    if (body.current) {
      body.current.rotation.y = 0.5 * Math.sin(swayPhase.current);
    }

    // Exhaust flicker (never frozen — the outline ignores the flames)
    if (flameOuter.current) {
      flameOuter.current.scale.y =
        1 + 0.22 * Math.sin(t * 21) + 0.1 * Math.sin(t * 47);
      const width = 1 + 0.12 * Math.sin(t * 33);
      flameOuter.current.scale.x = width;
      flameOuter.current.scale.z = width;
    }
    if (flameInner.current) {
      flameInner.current.scale.y = 1 + 0.3 * Math.sin(t * 27 + 1.3);
    }

    // Hover: wash the hull out toward white (glass and flames keep
    // their own look)
    const ease = Math.min(delta * 6, 1);
    materials.steel.emissiveIntensity +=
      ((hovered ? HOVER_EMISSIVE : 0) - materials.steel.emissiveIntensity) *
      ease;
    materials.steelDark.emissiveIntensity = materials.steel.emissiveIntensity;
    materials.red.emissiveIntensity = materials.steel.emissiveIntensity;
    materials.purple.emissiveIntensity = materials.steel.emissiveIntensity;

    // Hover: hand the ship's silhouette to the overlay outline
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
      <group ref={rig} scale={config.radius}>
        <group ref={body}>
          <mesh
            ref={registerOutlineMesh}
            geometry={fuselageGeometry}
            material={materials.steel}
          />
          {/* Red nose cone with a purple tip bauble */}
          <mesh
            ref={registerOutlineMesh}
            material={materials.red}
            position={[0, 1, 0]}
          >
            <coneGeometry args={[0.33, 0.6, 24]} />
          </mesh>
          <mesh
            ref={registerOutlineMesh}
            material={materials.purple}
            position={[0, 1.34, 0]}
          >
            <sphereGeometry args={[0.09, 12, 8]} />
          </mesh>
          {/* Porthole: purple rim + glass, proud of the hull on +Z (the
              camera side, thanks to the rig basis) */}
          {/* z 0.455/0.46: proud of the hull, whose lathe radius at this
              height is ~0.443 — any less buries the glass in steel */}
          <mesh material={materials.glass} position={[0, 0.22, 0.455]}>
            <circleGeometry args={[0.19, 20]} />
          </mesh>
          <mesh
            ref={registerOutlineMesh}
            material={materials.purple}
            position={[0, 0.22, 0.46]}
          >
            <torusGeometry args={[0.2, 0.05, 10, 24]} />
          </mesh>
          {/* Trim bands around the belly: red over purple */}
          <mesh material={materials.red} position={[0, -0.14, 0]}>
            <cylinderGeometry args={[0.465, 0.465, 0.1, 24, 1, true]} />
          </mesh>
          <mesh material={materials.purple} position={[0, -0.27, 0]}>
            <cylinderGeometry args={[0.45, 0.45, 0.05, 24, 1, true]} />
          </mesh>
          {/* Three swept fins */}
          {FIN_YAWS.map((yaw) => (
            <group key={yaw} rotation={[0, yaw, 0]}>
              <mesh
                ref={registerOutlineMesh}
                geometry={finGeometry}
                material={materials.red}
              />
            </group>
          ))}
          {/* Engine bell + flame */}
          <mesh
            ref={registerOutlineMesh}
            material={materials.steelDark}
            position={[0, -0.88, 0]}
          >
            <cylinderGeometry args={[0.2, 0.3, 0.28, 16]} />
          </mesh>
          <mesh
            ref={flameOuter}
            material={materials.flameOuter}
            position={[0, -1.3, 0]}
            rotation={[Math.PI, 0, 0]}
          >
            <coneGeometry args={[0.2, 0.65, 12]} />
          </mesh>
          <mesh
            ref={flameInner}
            material={materials.flameInner}
            position={[0, -1.22, 0]}
            rotation={[Math.PI, 0, 0]}
          >
            <coneGeometry args={[0.11, 0.4, 10]} />
          </mesh>
        </group>
      </group>
    </group>
  );
}
