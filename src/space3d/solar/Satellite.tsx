import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import {
  planetPosition,
  satelliteLegsDirection,
  satellitePartState,
  satelliteViewFrame,
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
import { createVideoScreenTexture } from "../textures";
import { hoverState } from "../../solarHover";
import { applyShimmer, createShimmerUniforms } from "./goldShimmer";
import InteractiveGlow from "./InteractiveGlow";

/**
 * The Sputnik-style satellite: a polished metal sphere trailing a cone of
 * four antenna legs, with a blinking beacon capping the head dead
 * opposite the cone. On /home the whole body is one link — to
 * /projects-and-toys — reusing the asteroid link plumbing (BodyAnchors
 * overlay, hover freeze/brighten/outline, landing fade) via the same
 * config. On /home a wave of energy also washes over the whole body
 * every few seconds — a purple band (goldShimmer.ts) travelling from the
 * beacon down the antenna cone, as if it were transmitting — so the one
 * link out here reads as alive. On /projects-and-toys the camera closes
 * in (CameraRig's satellite perch) and the body's PARTS become the links: the antenna
 * cone (the Zip blog post), a little video screen set into the head (the
 * Zip launch reel), a pen floating under the cone (SVG Studio) and a
 * mid-century vase standing on top of the head (/shop, the 3D print
 * store). The parts exist for that view only — they fade in on the way
 * there and out on the way back — and each gets the Earth treatment on
 * hover: brighten, pulsing silhouette outline, an always-on halo. A gold
 * glint also sweeps across the parts every few seconds (goldShimmer.ts)
 * so the clickable pieces stand out from the head they sit on, hovered
 * or not.
 *
 * Orientation: the home camera co-rotates with Earth's orbit, so a fixed
 * world heading would slowly wheel around on screen. The rig therefore
 * re-aims the leg cone every frame (satelliteLegsDirection — fixed in the
 * co-rotating frame), and the body's only motion is a slow roll about
 * that leg axis: the cone spins in place, the legs never leave their
 * heading. The beacon sits on that axis, and the link parts hang off the
 * rig rather than the rolling body, so they all hold still. The parts
 * live in a "presentation" frame whose +Z faces the close-up perch and
 * whose +Y is that view's screen-up (satelliteViewFrame, the same
 * function CameraRig perches with), so their layout is designed in screen
 * terms — screen lower right, vase on top, pen under the cone — and lands
 * facing the camera by construction.
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
/** The vase's self-glow (in its own glaze), resting and hovered */
const VASE_BASE_EMISSIVE = 0.45;
const VASE_HOVER_EMISSIVE = 1.5;
/** The pen's self-glow (in its own colors), resting and hovered */
const PEN_BASE_EMISSIVE = 0.4;
const PEN_HOVER_EMISSIVE = 1.3;
/** Slow the body roll well below the config spin (a stately tumble) */
const ROLL_SPEED_SCALE = 0.35;

/** The gold glint (goldShimmer.ts): one sweep every PERIOD, crossing the
 *  body — ±SPAN radii along the screen diagonal, lower left to upper
 *  right — in SWEEP seconds, then resting off the body until the next.
 *  Under reduced motion the band parks over everything as a faint,
 *  steady gilt instead. */
const SHIMMER_PERIOD_SECONDS = 3;
const SHIMMER_SWEEP_SECONDS = 1.1;
const SHIMMER_SPAN_RADII = 2;
const SHIMMER_HALF_WIDTH_RADII = 0.35;
const SHIMMER_STRENGTH = 0.5;
const SHIMMER_STATIC_STRENGTH = 0.12;

/** The /home energy wave (goldShimmer.ts too, a second band): one pulse
 *  every PERIOD, running the length of the body along the leg axis —
 *  from just past the beacon to just past the antenna tips — in SWEEP
 *  seconds, then resting off the body until the next. It follows the
 *  landing fade and eases away toward the close-up (the parts there
 *  carry the gold glint instead). Under reduced motion it parks over
 *  the body as a faint, steady tint. */
const WAVE_PERIOD_SECONDS = 3.5;
const WAVE_SWEEP_SECONDS = 1.1;
const WAVE_HALF_WIDTH_RADII = 0.4;
const WAVE_STRENGTH = 0.75;
const WAVE_STATIC_STRENGTH = 0.12;
const WAVE_COLOR = "#9e80f9";
const WAVE_EASE_SECONDS = 0.6;

/** The vase's silhouette — a LatheGeometry profile, [radius, height] in
 *  units of the head's radius, foot to lip: a low round belly drawn up
 *  into a long neck with a small flared lip, the mid-century bud vase.
 *  The last points turn back inward for the rim and the mouth. */
const VASE_PROFILE: [number, number][] = [
  [0, 0],
  [0.12, 0],
  [0.17, 0.02],
  [0.21, 0.07],
  [0.225, 0.14],
  [0.21, 0.22],
  [0.165, 0.3],
  [0.115, 0.37],
  [0.085, 0.44],
  [0.072, 0.52],
  [0.075, 0.58],
  [0.095, 0.63],
  [0.1, 0.65],
  [0.075, 0.65],
  [0.065, 0.62],
];
/** The anchor (halo + overlay center) sits this far above the surface,
 *  about the vase's middle; the foot is sunk a hair under the surface so
 *  no seam shows where the sphere curves away beneath it */
const VASE_ANCHOR_LIFT = 0.25;
const VASE_FOOT_SINK = 0.03;

/** The pen (SVG Studio) floats under the antenna cone, in the
 *  presentation frame: its center in head radii from the head's center
 *  (screen-right, screen-down, toward the camera) and its slant, radians
 *  — nib to the lower left, cap to the upper right. The dimensions are
 *  head radii along the pen's own axis (+Y toward the cap). */
const PEN_CENTER = { x: 1.5, y: -2.2, z: 0.15 };
const PEN_SLANT = -Math.PI / 4;
const PEN_BARREL_RADIUS = 0.075;
const PEN_BARREL_LENGTH = 1;
const PEN_NIB_LENGTH = 0.28;
const PEN_CAP_RADIUS = 0.085;
const PEN_CAP_LENGTH = 0.34;
/** Idle drift: a slow bob (head radii) and a rocking of the slant (rad) */
const PEN_BOB = 0.05;
const PEN_ROCK = 0.06;

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

/** Where each head part sits on the hemisphere facing the close-up
 *  camera: `polar` is degrees off the camera-facing pole (0 = dead
 *  center, 90 = the limb), `azimuth` degrees counter-clockwise from
 *  screen-right. The antenna cone reaches off screen-right, the beacon
 *  (capping the head opposite it) peeks past the upper-left limb on its
 *  own, and the pen floats off the head (PEN_CENTER). The vase takes the
 *  top of the head — just short of the limb, so its foot visibly rests
 *  on the curve — where its axis is screen-up and it stands upright on
 *  screen; the screen fills the lower right. */
const HEAD_PART_PLACEMENTS: Record<
  Exclude<SatellitePart, "antenna" | "pen">,
  { polar: number; azimuth: number }
> = {
  screen: { polar: 40, azimuth: -20 },
  vase: { polar: 82, azimuth: 90 },
};

const Y_AXIS = new THREE.Vector3(0, 1, 0);
const UP = new THREE.Vector3(0, 1, 0);
const ZERO = new THREE.Vector3(0, 0, 0);
const PLAIN_TINT = new THREE.Color(1, 1, 1);
/** The unlit display brightens by scaling its map */
const HOVER_TINT = new THREE.Color(1.7, 1.7, 1.7);

// scratch values, reused every frame
const legsDir = new THREE.Vector3();
const legsBack = new THREE.Vector3();
const legsMatrix = new THREE.Matrix4();
const perchDir = new THREE.Vector3();
const perchUp = new THREE.Vector3();
const frameMatrix = new THREE.Matrix4();
const frameQuat = new THREE.Quaternion();
const rigInverse = new THREE.Quaternion();
const camRight = new THREE.Vector3();
const camUp = new THREE.Vector3();

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
 *  tangent plane allows, so the screen and the vase stand upright.
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
  const vaseBody = useRef<THREE.Mesh>(null);
  const legMeshes = useRef<THREE.Mesh[]>([]);
  const penMeshes = useRef<THREE.Mesh[]>([]);
  const partAnchors = useRef<Record<SatellitePart, THREE.Object3D | null>>({
    antenna: null,
    screen: null,
    pen: null,
    vase: null,
  });
  const penPhase = useRef(0);
  const opacity = useRef(visible ? 1 : 0);
  const partsOpacity = useRef(partsActive ? 1 : 0);
  /** parts × body opacity: what the part halos follow */
  const partsShown = useRef(partsOpacity.current * opacity.current);
  const roll = useRef(0);
  /** 0..1: how much of the /home wave is showing (eased on/off) */
  const waveWeight = useRef(bodyLink ? 1 : 0);

  const bodyRadius = config.radius * SATELLITE_BODY_RADIUS_RATIO;
  const legLength = config.radius * SATELLITE_LEG_LENGTH_RATIO;

  const registerLeg = useCallback((mesh: THREE.Mesh | null) => {
    if (mesh && !legMeshes.current.includes(mesh)) {
      legMeshes.current.push(mesh);
    }
  }, []);
  const registerPen = useCallback((mesh: THREE.Mesh | null) => {
    if (mesh && !penMeshes.current.includes(mesh)) {
      penMeshes.current.push(mesh);
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

  const shimmer = useMemo(() => createShimmerUniforms(), []);
  const wave = useMemo(() => createShimmerUniforms(WAVE_COLOR), []);
  const materials = useMemo(() => {
    const set = {
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
      // The pen floats on the shadowed side too, so it carries its own
      // glow: the site's purple for the barrel, a near-black cap, a
      // steel nib and clip
      penBarrel: new THREE.MeshStandardMaterial({
        color: "#7c62e0",
        metalness: 0.1,
        roughness: 0.4,
        emissive: "#7c62e0",
        emissiveIntensity: PEN_BASE_EMISSIVE,
        transparent: true,
      }),
      penCap: new THREE.MeshStandardMaterial({
        color: "#2a2440",
        metalness: 0.2,
        roughness: 0.45,
        emissive: "#4a4070",
        emissiveIntensity: PEN_BASE_EMISSIVE,
        transparent: true,
      }),
      penSteel: new THREE.MeshStandardMaterial({
        color: "#cfd6dd",
        metalness: 0.8,
        roughness: 0.35,
        emissive: "#cfd6dd",
        emissiveIntensity: PEN_BASE_EMISSIVE * 0.6,
        transparent: true,
      }),
      // The vase sits on the head's shadowed side, so it glows in its own
      // glaze (emissive = diffuse) rather than reading as a black
      // silhouette: a satin teal, the mid-century palette's cool note
      vase: new THREE.MeshStandardMaterial({
        color: "#2f9e90",
        metalness: 0,
        roughness: 0.55,
        emissive: "#2f9e90",
        emissiveIntensity: VASE_BASE_EMISSIVE,
        transparent: true,
      }),
    };
    // The /home wave crosses the whole body; the link parts carry the
    // gold glint (the legs are the antenna link, so they take both; the
    // head itself is not a link, so it gets no glint)
    applyShimmer(set.body, [wave]);
    applyShimmer(set.bulb, [wave]);
    applyShimmer(set.leg, [wave, shimmer]);
    [
      set.bezel,
      set.display,
      set.penBarrel,
      set.penCap,
      set.penSteel,
      set.vase,
    ].forEach((material) => applyShimmer(material, [shimmer]));
    return set;
  }, [shimmer, wave]);
  const bodyMaterials = useMemo(
    () => [materials.body, materials.leg, materials.bulb],
    [materials],
  );
  const partMaterials = useMemo(
    () => [
      materials.bezel,
      materials.display,
      materials.penBarrel,
      materials.penCap,
      materials.penSteel,
      materials.vase,
    ],
    [materials],
  );
  useEffect(
    () => () => {
      materials.display.map?.dispose();
      Object.values(materials).forEach((material) => material.dispose());
    },
    [materials],
  );

  const bodyGeometry = useMemo(
    () => new THREE.SphereGeometry(bodyRadius, 24, 16),
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
  /** The antenna link's anchor: the cone's midpoint, on its axis */
  const antennaAxial =
    (bodyRadius * 0.7 + legLength / 2) * Math.cos(SATELLITE_LEG_TILT);

  // Head parts, posed in the presentation frame (see HEAD_PART_PLACEMENTS)
  const poses = useMemo(() => {
    const screenDir = discDirection(HEAD_PART_PLACEMENTS.screen);
    const vaseDir = discDirection(HEAD_PART_PLACEMENTS.vase);
    return {
      // Sunk a hair so the bezel's corners bed into the curve
      screen: {
        position: screenDir.clone().multiplyScalar(bodyRadius * 0.98),
        quaternion: surfacePose(screenDir),
      },
      // Standing on top: anchored about its middle, foot sunk just under
      // the surface (the mesh offsets itself below the anchor)
      vase: {
        position: vaseDir
          .clone()
          .multiplyScalar(bodyRadius * (1 + VASE_ANCHOR_LIFT)),
        quaternion: surfacePose(vaseDir),
      },
    };
  }, [bodyRadius]);

  const vaseGeometry = useMemo(
    () =>
      new THREE.LatheGeometry(
        VASE_PROFILE.map(
          ([r, h]) => new THREE.Vector2(r * bodyRadius, h * bodyRadius),
        ),
        28,
      ),
    [bodyRadius],
  );
  useEffect(() => () => vaseGeometry.dispose(), [vaseGeometry]);

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
    // sight down the NEGATED direction; this keeps local +Y world-up, so
    // the rig's frame never twists as the heading drifts (a minimal Z→dir
    // rotation does not guarantee that)
    if (rig.current) {
      satelliteLegsDirection(t, legsDir);
      legsMatrix.lookAt(ZERO, legsBack.copy(legsDir).negate(), UP);
      rig.current.quaternion.setFromRotationMatrix(legsMatrix);
    }

    // Presentation frame: +Z toward the close-up perch, +Y its screen-up.
    // `present` is a child of the rig, so local = rig⁻¹ · world.
    if (present.current && rig.current && group.current) {
      satelliteViewFrame(group.current.position, perchDir, perchUp);
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
    const penGlow =
      partHovered === "pen" ? PEN_HOVER_EMISSIVE : PEN_BASE_EMISSIVE;
    glowTo(materials.penBarrel, penGlow);
    glowTo(materials.penCap, penGlow);
    glowTo(materials.penSteel, penGlow * 0.6);
    glowTo(
      materials.vase,
      partHovered === "vase" ? VASE_HOVER_EMISSIVE : VASE_BASE_EMISSIVE,
    );

    // The pen drifts — a slow bob and a rock of its slant — frozen while
    // hovered so the outline is cut from a still pose (and held still
    // under reduced motion)
    const pen = partAnchors.current.pen;
    if (pen) {
      if (partHovered !== "pen" && !prefersReducedMotion) {
        penPhase.current += delta;
      }
      const phase = penPhase.current;
      pen.position.set(
        PEN_CENTER.x * bodyRadius,
        (PEN_CENTER.y + Math.sin(phase * 1.3) * PEN_BOB) * bodyRadius,
        PEN_CENTER.z * bodyRadius,
      );
      pen.rotation.z = PEN_SLANT + Math.sin(phase * 0.8) * PEN_ROCK;
    }

    // The gold glint: slide the band along the screen diagonal (camera
    // right + up) across the body, then rest it off the body until the
    // next sweep. Follows the parts' reveal, so /home never glints.
    if (group.current) {
      group.current.getWorldPosition(shimmer.origin.value);
      camRight.setFromMatrixColumn(camera.matrixWorld, 0);
      camUp.setFromMatrixColumn(camera.matrixWorld, 1);
      shimmer.direction.value.copy(camRight).add(camUp).normalize();
      const span = config.radius * SHIMMER_SPAN_RADII;
      if (prefersReducedMotion) {
        // A band wide enough to cover the whole body evenly
        shimmer.offset.value = 0;
        shimmer.halfWidth.value = span * 20;
        shimmer.strength.value = SHIMMER_STATIC_STRENGTH * partsShown.current;
      } else {
        const sweep = Math.min(
          (t % SHIMMER_PERIOD_SECONDS) / SHIMMER_SWEEP_SECONDS,
          1,
        );
        shimmer.offset.value = THREE.MathUtils.lerp(-span, span, sweep);
        shimmer.halfWidth.value = config.radius * SHIMMER_HALF_WIDTH_RADII;
        shimmer.strength.value = SHIMMER_STRENGTH * partsShown.current;
      }

      // The /home energy wave: a band sliding along the leg axis, beacon
      // to antenna tips, clear of the body at both ends of its run
      const waveStep = delta / WAVE_EASE_SECONDS;
      waveWeight.current = THREE.MathUtils.clamp(
        waveWeight.current + (bodyLink ? waveStep : -waveStep),
        0,
        1,
      );
      wave.origin.value.copy(shimmer.origin.value);
      wave.direction.value.copy(legsDir);
      const waveShown = waveWeight.current * opacity.current;
      if (prefersReducedMotion) {
        wave.offset.value = 0;
        wave.halfWidth.value = config.radius * 20;
        wave.strength.value = WAVE_STATIC_STRENGTH * waveShown;
      } else {
        const halfWidth = config.radius * WAVE_HALF_WIDTH_RADII;
        const start = -(bodyRadius * 1.2 + halfWidth);
        const end = bodyRadius * 0.7 + legLength + halfWidth;
        const sweep = Math.min(
          (t % WAVE_PERIOD_SECONDS) / WAVE_SWEEP_SECONDS,
          1,
        );
        wave.offset.value = THREE.MathUtils.lerp(start, end, sweep);
        wave.halfWidth.value = halfWidth;
        wave.strength.value = WAVE_STRENGTH * waveShown;
      }
    }

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
          : partHovered === "pen"
            ? penMeshes.current
            : [
                partHovered === "screen"
                  ? screenBezel.current
                  : vaseBody.current,
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
        {/* Blinking beacon capping the head, dead opposite the antenna
            cone: on the roll axis, so it holds still while the legs spin */}
        <mesh
          ref={bulb}
          material={materials.bulb}
          position={[0, 0, -bodyRadius * 1.05]}
        >
          <sphereGeometry args={[bodyRadius * 0.15, 12, 8]} />
        </mesh>
        {/* The /projects-and-toys link parts (faded out elsewhere) */}
        <group ref={parts}>
          {/* The antenna cone IS the blog link: just its anchor + halo
              here, the legs themselves roll with the body above */}
          <group ref={anchorRef.antenna} position={[0, 0, antennaAxial]}>
            <InteractiveGlow
              radius={legLength * 0.22}
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
                    bodyRadius * 0.64,
                    bodyRadius * 0.46,
                    bodyRadius * 0.09,
                  ]}
                />
              </mesh>
              <mesh
                material={materials.display}
                position={[0, 0, bodyRadius * 0.06]}
              >
                <planeGeometry args={[bodyRadius * 0.56, bodyRadius * 0.38]} />
              </mesh>
              <InteractiveGlow
                radius={satellitePartState.screen.radius}
                opacityRef={partsShown}
                enabled={partsActive}
                strength={0.35}
              />
            </group>
            {/* The vase: lathe-turned, standing on top of the head (its
                axis is the pose's outward +Z, so the lathe's +Y turns
                onto it) */}
            <group
              ref={anchorRef.vase}
              position={poses.vase.position}
              quaternion={poses.vase.quaternion}
            >
              <mesh
                ref={vaseBody}
                geometry={vaseGeometry}
                material={materials.vase}
                position={[
                  0,
                  0,
                  -(VASE_ANCHOR_LIFT + VASE_FOOT_SINK) * bodyRadius,
                ]}
                rotation={[Math.PI / 2, 0, 0]}
              />
              <InteractiveGlow
                radius={satellitePartState.vase.radius}
                opacityRef={partsShown}
                enabled={partsActive}
                strength={0.35}
              />
            </group>
            {/* The pen (SVG Studio), floating under the antenna cone, nib
                to the lower left: barrel, steel nib, a capped end with a
                clip. Its own axis is +Y (the cylinders'), so the slant is
                a roll about Z; the frame loop drives its pose (idle bob
                and rock) and the group doubles as the anchor. */}
            <group ref={anchorRef.pen}>
              <mesh ref={registerPen} material={materials.penBarrel}>
                <cylinderGeometry
                  args={[
                    PEN_BARREL_RADIUS * bodyRadius,
                    PEN_BARREL_RADIUS * bodyRadius,
                    PEN_BARREL_LENGTH * bodyRadius,
                    16,
                  ]}
                />
              </mesh>
              {/* nib: a cone off the barrel's lower end (apex down) */}
              <mesh
                ref={registerPen}
                material={materials.penSteel}
                position={[
                  0,
                  -(PEN_BARREL_LENGTH / 2 + PEN_NIB_LENGTH / 2) * bodyRadius,
                  0,
                ]}
                rotation={[Math.PI, 0, 0]}
              >
                <coneGeometry
                  args={[
                    PEN_BARREL_RADIUS * bodyRadius,
                    PEN_NIB_LENGTH * bodyRadius,
                    16,
                  ]}
                />
              </mesh>
              {/* cap: a fatter sleeve over the upper end, rounded off */}
              <mesh
                ref={registerPen}
                material={materials.penCap}
                position={[
                  0,
                  (PEN_BARREL_LENGTH / 2 - PEN_CAP_LENGTH / 2 + 0.06) *
                    bodyRadius,
                  0,
                ]}
              >
                <cylinderGeometry
                  args={[
                    PEN_CAP_RADIUS * bodyRadius,
                    PEN_CAP_RADIUS * bodyRadius,
                    PEN_CAP_LENGTH * bodyRadius,
                    16,
                  ]}
                />
              </mesh>
              <mesh
                ref={registerPen}
                material={materials.penCap}
                position={[0, (PEN_BARREL_LENGTH / 2 + 0.06) * bodyRadius, 0]}
              >
                <sphereGeometry args={[PEN_CAP_RADIUS * bodyRadius, 12, 8]} />
              </mesh>
              {/* clip, along the cap's camera-facing flank */}
              <mesh
                ref={registerPen}
                material={materials.penSteel}
                position={[
                  PEN_CAP_RADIUS * 1.15 * bodyRadius,
                  (PEN_BARREL_LENGTH / 2 - PEN_CAP_LENGTH / 2 + 0.08) *
                    bodyRadius,
                  0,
                ]}
              >
                <boxGeometry
                  args={[
                    0.03 * bodyRadius,
                    PEN_CAP_LENGTH * 0.85 * bodyRadius,
                    0.05 * bodyRadius,
                  ]}
                />
              </mesh>
              <InteractiveGlow
                radius={satellitePartState.pen.radius}
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
