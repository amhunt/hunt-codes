import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { DecalGeometry } from "three/examples/jsm/geometries/DecalGeometry.js";

import {
  planetPosition,
  satelliteLegsDirection,
  satellitePartState,
  satellitePerchPose,
  SATELLITE_BODY_RADIUS_RATIO,
  SATELLITE_LEG_LENGTH_RATIO,
  SATELLITE_LEG_TILT,
  type SolarPlanetConfig,
} from "./constants";
import {
  asteroidOutlineId,
  SATELLITE_PARTS,
  satellitePartOutlineId,
  type SatellitePart,
} from "../../solarAnchorIds";
import { writeSilhouette } from "./outline";
import {
  createGraffitiHeartTexture,
  createVideoScreenTexture,
} from "../textures";
import { hoverState } from "../../solarHover";
import InteractiveGlow from "./InteractiveGlow";

/**
 * The Sputnik-style satellite: a polished metal sphere trailing a cone of
 * four antenna legs, with a blinking beacon on top of the head. On /home
 * the whole body is one link — to /projects-and-toys — reusing the
 * asteroid link plumbing (BodyAnchors overlay, hover freeze/brighten/
 * outline, landing fade) via the same config. On /projects-and-toys the
 * camera closes in (CameraRig's satellite perch) and the body's PARTS
 * become the links: the antenna cone (the Zip blog post), a little video
 * screen set into the head (the Zip launch reel), a red graffiti heart
 * sprayed on the head (SVG Studio) and a cargo crate strapped to it
 * (/shop). The parts exist for that view only — they fade in on the way
 * there and out on the way back — and each gets the Earth treatment on
 * hover: brighten, pulsing silhouette outline, an always-on halo.
 *
 * Orientation: the home camera co-rotates with Earth's orbit, so a fixed
 * world heading would slowly wheel around on screen. The rig therefore
 * re-aims the leg cone every frame (satelliteLegsDirection — fixed in the
 * co-rotating frame), and the body's only motion is a slow roll about
 * that leg axis: the cone spins in place, the legs never leave their
 * heading. The beacon and the link parts hang off the rig, not the
 * rolling body, so they hold still. The parts live in a "presentation"
 * frame whose +Z faces the close-up perch and whose +Y is that view's
 * screen-up (satellitePerchPose, the same pose CameraRig perches
 * at), so their layout is designed in screen terms — screen lower
 * right, heart upper left, crate lower left — and lands facing the
 * camera by construction.
 */

const FADE_IN_SECONDS = 3;
const FADE_OUT_SECONDS = 1;
/** The parts' fade, riding the 2s swoop into and out of the close-up */
const PARTS_REVEAL_SECONDS = 1;

const LEG_COUNT = 4;
const BLINK_PERIOD_SECONDS = 1.2;
const BLINK_ON_FRACTION = 0.55;
const HOVER_EMISSIVE = 0.9;
/** A faint self-glow so the head's unlit side (the close-up looks down
 *  on its night side — the sun sits below the frame) still reads as
 *  metal against the black sky instead of vanishing into it */
const BASE_EMISSIVE = 0.07;
/** The crate's self-glow (in its own colors), resting and hovered */
const CRATE_BASE_EMISSIVE = 0.45;
const CRATE_HOVER_EMISSIVE = 1.5;
/** Slow the body roll well below the config spin (a stately tumble) */
const ROLL_SPEED_SCALE = 0.35;

/** Where each head part sits on the hemisphere facing the close-up
 *  camera: `polar` is degrees off the camera-facing pole (0 = dead
 *  center, 90 = the limb), `azimuth` degrees counter-clockwise from
 *  screen-right. The beacon (rig +Y) lands top-center on its own and the
 *  antenna cone runs off screen-right; the head is cut off by the
 *  bottom and left edges, so these keep to its upper and right reaches.
 *  The close-up camera sits only ~2.5 head radii out, which shrinks the
 *  visible cap and stretches its rim, so the parts stay well inside
 *  ~40° or they'd smear along the limb. */
const HEAD_PART_PLACEMENTS: Record<
  Exclude<SatellitePart, "antenna">,
  { polar: number; azimuth: number }
> = {
  screen: { polar: 32, azimuth: -20 },
  heart: { polar: 28, azimuth: 120 },
  crate: { polar: 36, azimuth: 45 },
};
/** The antenna link's anchor, as a fraction of the leg length past the
 *  attach point: mid-cone, roughly the middle of the visible stretch */
const ANTENNA_ANCHOR_ALONG = 0.5;
/** The tag's slant, radians */
const HEART_TILT = -0.3;

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const Z_AXIS = new THREE.Vector3(0, 0, 1);
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3(0, 0, 0);
const PLAIN_TINT = new THREE.Color(1, 1, 1);
/** Unlit parts (the screen, the heart) brighten by scaling their map */
const HOVER_TINT = new THREE.Color(1.7, 1.7, 1.7);

// scratch values, reused every frame
const legsDir = new THREE.Vector3();
const legsBack = new THREE.Vector3();
const legsMatrix = new THREE.Matrix4();
const perchPos = new THREE.Vector3();
const perchLook = new THREE.Vector3();
const perchDir = new THREE.Vector3();
const perchForward = new THREE.Vector3();
const perchUp = new THREE.Vector3();
const frameMatrix = new THREE.Matrix4();
const frameQuat = new THREE.Quaternion();
const rigInverse = new THREE.Quaternion();

/** Unit direction on the camera-facing disc (see HEAD_PART_PLACEMENTS) */
function discDirection({
  polar,
  azimuth,
}: {
  polar: number;
  azimuth: number;
}): THREE.Vector3 {
  const p = THREE.MathUtils.degToRad(polar);
  const a = THREE.MathUtils.degToRad(azimuth);
  return new THREE.Vector3(
    Math.sin(p) * Math.cos(a),
    Math.sin(p) * Math.sin(a),
    Math.cos(p),
  );
}

/** Pose for a part sitting on the head at direction `dir`: local +Z
 *  points outward along it, local +Y as close to screen-up as the
 *  tangent plane allows, so the screen and the crate stand upright.
 *  (Matrix4.lookAt builds a frame whose +Z runs target → eye.) */
function surfacePose(dir: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromRotationMatrix(
    new THREE.Matrix4().lookAt(dir, ZERO, Y_AXIS),
  );
}

export default function Satellite({
  config,
  visible = true,
  bodyLink = true,
  partsActive = false,
}: {
  config: SolarPlanetConfig;
  /** Shows the satellite (it fades in and out) */
  visible?: boolean;
  /** The whole body is the /projects-and-toys link (the home view): its
   *  halo is on and hovering the overlay brightens everything */
  bodyLink?: boolean;
  /** The close-up view: the link parts fade in and become hoverable */
  partsActive?: boolean;
}) {
  const group = useRef<THREE.Group>(null); // orbit position + fade
  const rig = useRef<THREE.Group>(null); // aims the leg cone
  const body = useRef<THREE.Group>(null); // rolls about the leg axis
  const parts = useRef<THREE.Group>(null); // hidden while faded out
  const present = useRef<THREE.Group>(null); // faces the close-up perch
  const head = useRef<THREE.Mesh>(null);
  const bulb = useRef<THREE.Mesh>(null);
  const screenBezel = useRef<THREE.Mesh>(null);
  const heartDecal = useRef<THREE.Mesh>(null);
  const crateBox = useRef<THREE.Mesh>(null);
  const legMeshes = useRef<THREE.Mesh[]>([]);
  const partAnchors = useRef<Record<SatellitePart, THREE.Object3D | null>>({
    antenna: null,
    screen: null,
    heart: null,
    crate: null,
  });
  const opacity = useRef(visible ? 1 : 0);
  const partsOpacity = useRef(partsActive ? 1 : 0);
  /** parts × body opacity: what the part halos follow */
  const partsShown = useRef(partsOpacity.current * opacity.current);
  const roll = useRef(0);

  const bodyRadius = config.radius * SATELLITE_BODY_RADIUS_RATIO;
  const legLength = config.radius * SATELLITE_LEG_LENGTH_RATIO;

  const registerLeg = useCallback((mesh: THREE.Mesh | null) => {
    if (mesh && !legMeshes.current.includes(mesh)) {
      legMeshes.current.push(mesh);
    }
  }, []);
  const anchorRef = useMemo(
    () =>
      Object.fromEntries(
        SATELLITE_PARTS.map((part) => [
          part,
          (el: THREE.Object3D | null) => {
            partAnchors.current[part] = el;
          },
        ]),
      ) as Record<SatellitePart, (el: THREE.Object3D | null) => void>,
    [],
  );

  const materials = useMemo(
    () => ({
      body: new THREE.MeshStandardMaterial({
        color: "#dfe4ea",
        metalness: 0.85,
        roughness: 0.3,
        emissive: "#ffffff",
        emissiveIntensity: BASE_EMISSIVE,
        transparent: true,
      }),
      leg: new THREE.MeshStandardMaterial({
        color: "#aab2bc",
        metalness: 0.8,
        roughness: 0.45,
        emissive: "#ffffff",
        emissiveIntensity: BASE_EMISSIVE,
        transparent: true,
      }),
      bulb: new THREE.MeshBasicMaterial({
        color: "#ff5252",
        transparent: true,
      }),
      // The screen: a dark bezel around an unlit, self-lit display
      bezel: new THREE.MeshStandardMaterial({
        color: "#1b1f2a",
        metalness: 0.4,
        roughness: 0.5,
        emissive: "#9e80f9",
        emissiveIntensity: 0,
        transparent: true,
      }),
      display: new THREE.MeshBasicMaterial({
        map: createVideoScreenTexture(),
        transparent: true,
      }),
      // Same sticker treatment as the badge decals: unlit so the paint
      // stays red on the dark side, polygonOffset floats it off the faces
      heart: new THREE.MeshBasicMaterial({
        map: createGraffitiHeartTexture(),
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -4,
      }),
      // The crate sits on the head's shadowed side, so it glows in its
      // own colors (emissive = diffuse) rather than reading as a black box
      crate: new THREE.MeshStandardMaterial({
        color: "#c9a56b",
        metalness: 0,
        roughness: 0.85,
        emissive: "#c9a56b",
        emissiveIntensity: CRATE_BASE_EMISSIVE,
        transparent: true,
      }),
      strap: new THREE.MeshStandardMaterial({
        color: "#5b3fc4",
        metalness: 0.1,
        roughness: 0.6,
        emissive: "#7c62e0",
        emissiveIntensity: CRATE_BASE_EMISSIVE,
        transparent: true,
      }),
    }),
    [],
  );
  const bodyMaterials = useMemo(
    () => [materials.body, materials.leg, materials.bulb],
    [materials],
  );
  const partMaterials = useMemo(
    () => [
      materials.bezel,
      materials.display,
      materials.heart,
      materials.crate,
      materials.strap,
    ],
    [materials],
  );
  useEffect(
    () => () => {
      materials.display.map?.dispose();
      materials.heart.map?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  const bodyGeometry = useMemo(
    // Segments for a head that fills the /projects-and-toys frame: the
    // old 24x16 read as facets along the rim and under the heart decal
    () => new THREE.SphereGeometry(bodyRadius, 48, 32),
    [bodyRadius],
  );
  useEffect(() => () => bodyGeometry.dispose(), [bodyGeometry]);

  // The antenna cone: thin rods splayed SATELLITE_LEG_TILT off local +Z,
  // evenly spaced around it, attached just aft of the sphere's surface
  const legs = useMemo(
    () =>
      Array.from({ length: LEG_COUNT }, (_, i) => {
        const around = (i / LEG_COUNT) * Math.PI * 2 + Math.PI / 4;
        const direction = new THREE.Vector3(
          Math.sin(SATELLITE_LEG_TILT) * Math.cos(around),
          Math.sin(SATELLITE_LEG_TILT) * Math.sin(around),
          Math.cos(SATELLITE_LEG_TILT),
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
  /** The antenna link's anchor, on the cone's axis */
  const antennaAxial =
    (bodyRadius * 0.7 + legLength * ANTENNA_ANCHOR_ALONG) *
    Math.cos(SATELLITE_LEG_TILT);

  // Head parts, posed in the presentation frame (see HEAD_PART_PLACEMENTS)
  const poses = useMemo(() => {
    const screenDir = discDirection(HEAD_PART_PLACEMENTS.screen);
    const heartDir = discDirection(HEAD_PART_PLACEMENTS.heart);
    const crateDir = discDirection(HEAD_PART_PLACEMENTS.crate);
    return {
      // Sunk a hair so the bezel's corners bed into the curve
      screen: {
        position: screenDir.clone().multiplyScalar(bodyRadius * 0.98),
        quaternion: surfacePose(screenDir),
      },
      heart: {
        position: heartDir.clone().multiplyScalar(bodyRadius),
        // Slanted like a sprayed tag
        quaternion: surfacePose(heartDir).multiply(
          new THREE.Quaternion().setFromAxisAngle(Z_AXIS, HEART_TILT),
        ),
      },
      // Strapped on: its bottom face sits just under the surface
      crate: {
        position: crateDir.clone().multiplyScalar(bodyRadius * 1.08),
        quaternion: surfacePose(crateDir),
      },
    };
  }, [bodyRadius]);

  // The heart is a decal clipped to the head's surface. It is cut from an
  // identity-posed copy of the sphere and mounted under the presentation
  // frame rather than the rolling body: the sphere is symmetric, so the
  // sticker lies on the surface wherever the body has rolled to.
  const heartGeometry = useMemo(() => {
    const target = new THREE.Mesh(bodyGeometry);
    const size = bodyRadius * 0.42;
    return new DecalGeometry(
      target,
      poses.heart.position,
      new THREE.Euler().setFromQuaternion(poses.heart.quaternion),
      new THREE.Vector3(size, size, bodyRadius * 0.35),
    );
  }, [bodyGeometry, bodyRadius, poses]);
  useEffect(() => () => heartGeometry.dispose(), [heartGeometry]);

  useFrame(({ clock, camera, size }, delta) => {
    const t = clock.elapsedTime;
    const bodyHovered = bodyLink && hoverState.asteroid === config.name;
    const partHovered = partsActive ? hoverState.satellitePart : null;

    if (group.current) {
      planetPosition(config, t, group.current.position);

      // Same landing-view fade as the asteroids
      const step = visible
        ? delta / FADE_IN_SECONDS
        : -delta / FADE_OUT_SECONDS;
      opacity.current = THREE.MathUtils.clamp(opacity.current + step, 0, 1);
      group.current.visible = opacity.current > 0.005;
      bodyMaterials.forEach((material) => {
        material.opacity = opacity.current;
      });
    }

    // The link parts ride the swoop: in on the way to the close-up, out
    // on the way back
    const partsStep = delta / PARTS_REVEAL_SECONDS;
    partsOpacity.current = THREE.MathUtils.clamp(
      partsOpacity.current + (partsActive ? partsStep : -partsStep),
      0,
      1,
    );
    partsShown.current = partsOpacity.current * opacity.current;
    if (parts.current) parts.current.visible = partsShown.current > 0.005;
    partMaterials.forEach((material) => {
      material.opacity = partsShown.current;
    });

    // Aim the leg cone (satelliteLegsDirection): lookAt aims local -Z, so
    // sight down the NEGATED direction; this keeps local +Y world-up (the
    // beacon stays on top of the head, which a minimal Z→dir rotation
    // does not guarantee)
    if (rig.current) {
      satelliteLegsDirection(t, legsDir);
      legsMatrix.lookAt(ZERO, legsBack.copy(legsDir).negate(), UP);
      rig.current.quaternion.setFromRotationMatrix(legsMatrix);
    }

    // Presentation frame: +Z toward the close-up perch, +Y that pose's
    // screen-up (world-up with the arrival view direction removed — the
    // perch yaws hard to put the head off-center, which rolls the frame).
    // `present` is a child of the rig, so local = rig⁻¹ · world.
    if (present.current && rig.current && group.current) {
      const persp = camera as THREE.PerspectiveCamera;
      satellitePerchPose(
        t,
        group.current.position,
        persp.fov,
        persp.aspect || 1,
        perchPos,
        perchLook,
      );
      perchDir.copy(perchPos).sub(group.current.position).normalize();
      perchForward.copy(perchLook).sub(perchPos).normalize();
      perchUp
        .copy(UP)
        .addScaledVector(perchForward, -UP.dot(perchForward))
        .normalize();
      frameMatrix.lookAt(perchDir, ZERO, perchUp);
      frameQuat.setFromRotationMatrix(frameMatrix);
      rigInverse.copy(rig.current.quaternion).invert();
      present.current.quaternion.copy(rigInverse).multiply(frameQuat);
    }

    // Slow roll about the leg axis — the cone spins in place. Frozen
    // while anything is hovered, like the asteroid spins (the outline is
    // cut from the frozen pose).
    if (body.current) {
      if (!bodyHovered && !partHovered) {
        roll.current += delta * Math.abs(config.spinSpeed) * ROLL_SPEED_SCALE;
      }
      body.current.rotation.z = roll.current;
    }

    // Beacon blink (hard on/off reads as a status light)
    if (bulb.current) {
      bulb.current.visible =
        t % BLINK_PERIOD_SECONDS < BLINK_PERIOD_SECONDS * BLINK_ON_FRACTION;
    }

    // Hover: wash the hovered thing out toward white. On /home that is
    // the whole body; in the close-up, just the hovered part.
    const ease = Math.min(delta * 6, 1);
    const glowTo = (material: THREE.MeshStandardMaterial, target: number) => {
      material.emissiveIntensity +=
        (target - material.emissiveIntensity) * ease;
    };
    glowTo(materials.body, bodyHovered ? HOVER_EMISSIVE : BASE_EMISSIVE);
    glowTo(
      materials.leg,
      bodyHovered || partHovered === "antenna" ? HOVER_EMISSIVE : BASE_EMISSIVE,
    );
    glowTo(materials.bezel, partHovered === "screen" ? 0.6 : 0);
    materials.display.color.lerp(
      partHovered === "screen" ? HOVER_TINT : PLAIN_TINT,
      ease,
    );
    materials.heart.color.lerp(
      partHovered === "heart" ? HOVER_TINT : PLAIN_TINT,
      ease,
    );
    glowTo(
      materials.crate,
      partHovered === "crate" ? CRATE_HOVER_EMISSIVE : CRATE_BASE_EMISSIVE,
    );
    glowTo(
      materials.strap,
      partHovered === "crate" ? CRATE_HOVER_EMISSIVE : CRATE_BASE_EMISSIVE,
    );

    // Publish the parts' world centers for their DOM overlays
    // (BodyAnchors glues the /projects-and-toys links to them)
    for (const part of SATELLITE_PARTS) {
      partAnchors.current[part]?.getWorldPosition(
        satellitePartState[part].position,
      );
    }

    // Hover outlines: hand the hovered thing's silhouette to its overlay
    if (bodyHovered && head.current && bulb.current) {
      writeSilhouette(
        asteroidOutlineId(config.name),
        [head.current, ...legMeshes.current, bulb.current],
        camera,
        size,
      );
    }
    if (partHovered) {
      const meshes =
        partHovered === "antenna"
          ? legMeshes.current
          : [
              partHovered === "screen"
                ? screenBezel.current
                : partHovered === "heart"
                  ? heartDecal.current
                  : crateBox.current,
            ].filter((mesh): mesh is THREE.Mesh => mesh !== null);
      writeSilhouette(
        satellitePartOutlineId(partHovered),
        meshes,
        camera,
        size,
      );
    }
  });

  return (
    <group ref={group}>
      {/* whole-body clickable halo (the /home link), riding the landing
          fade; off in the close-up, where the parts carry their own */}
      <InteractiveGlow
        radius={config.radius}
        opacityRef={opacity}
        enabled={bodyLink}
      />
      <group ref={rig}>
        <group ref={body}>
          <mesh ref={head} material={materials.body} geometry={bodyGeometry} />
          {legs.map((leg, i) => (
            <mesh
              key={i}
              ref={registerLeg}
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
          <sphereGeometry args={[bodyRadius * 0.12, 12, 8]} />
        </mesh>
        {/* The /projects-and-toys link parts (faded out elsewhere) */}
        <group ref={parts}>
          {/* The antenna cone IS the blog link: just its anchor + halo
              here, the legs themselves roll with the body above */}
          <group ref={anchorRef.antenna} position={[0, 0, antennaAxial]}>
            <InteractiveGlow
              radius={legLength * 0.2}
              opacityRef={partsShown}
              enabled={partsActive}
              strength={0.35}
            />
          </group>
          <group ref={present}>
            {/* The video screen: bezel + self-lit display */}
            <group
              ref={anchorRef.screen}
              position={poses.screen.position}
              quaternion={poses.screen.quaternion}
            >
              <mesh ref={screenBezel} material={materials.bezel}>
                <boxGeometry
                  args={[
                    bodyRadius * 0.52,
                    bodyRadius * 0.375,
                    bodyRadius * 0.09,
                  ]}
                />
              </mesh>
              <mesh
                material={materials.display}
                position={[0, 0, bodyRadius * 0.06]}
              >
                <planeGeometry args={[bodyRadius * 0.45, bodyRadius * 0.305]} />
              </mesh>
              <InteractiveGlow
                radius={satellitePartState.screen.radius}
                opacityRef={partsShown}
                enabled={partsActive}
                strength={0.35}
              />
            </group>
            {/* The graffiti heart: a decal on the surface (the anchor
                carries its halo and gives the overlay its center) */}
            <mesh
              ref={heartDecal}
              geometry={heartGeometry}
              material={materials.heart}
            />
            <group ref={anchorRef.heart} position={poses.heart.position}>
              <InteractiveGlow
                radius={satellitePartState.heart.radius}
                opacityRef={partsShown}
                enabled={partsActive}
                strength={0.35}
              />
            </group>
            {/* The cargo crate: a parcel under two straps and a knot */}
            <group
              ref={anchorRef.crate}
              position={poses.crate.position}
              quaternion={poses.crate.quaternion}
            >
              <mesh ref={crateBox} material={materials.crate}>
                <boxGeometry
                  args={[
                    bodyRadius * 0.34,
                    bodyRadius * 0.27,
                    bodyRadius * 0.24,
                  ]}
                />
              </mesh>
              <mesh material={materials.strap}>
                <boxGeometry
                  args={[
                    bodyRadius * 0.06,
                    bodyRadius * 0.285,
                    bodyRadius * 0.255,
                  ]}
                />
              </mesh>
              <mesh material={materials.strap}>
                <boxGeometry
                  args={[
                    bodyRadius * 0.355,
                    bodyRadius * 0.06,
                    bodyRadius * 0.255,
                  ]}
                />
              </mesh>
              <mesh
                material={materials.strap}
                position={[0, 0, bodyRadius * 0.14]}
              >
                <sphereGeometry args={[bodyRadius * 0.045, 10, 8]} />
              </mesh>
              <InteractiveGlow
                radius={satellitePartState.crate.radius}
                opacityRef={partsShown}
                enabled={partsActive}
                strength={0.35}
              />
            </group>
          </group>
        </group>
      </group>
    </group>
  );
}
