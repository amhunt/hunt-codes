import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { SUN_RADIUS, sunState } from "./constants";
import { SUN_SIZE, SUN_SURFACE_RADIUS } from "../../landingScene";
import { hoverState } from "../../solarHover";
import { createSunGlowTexture, createSunTexture } from "../textures";
import {
  createLetterPlane,
  measureCharWidths,
  retroFloralFont,
  useRetroFloralReady,
  type CurvedLetter,
} from "./curvedText";

/**
 * The sun, ported from hunt-codes-3: a slowly rotating sphere with the
 * mottled golden canvas texture, a soft glow sprite (billboarded, so the
 * corona reads from any camera angle), and the point light that lights
 * the planets. The whole group eases toward a per-view scale and
 * publishes the rendered scale so the DOM rings can track it; the glow
 * sprite eases toward a per-view size too — from the home sun-perch the
 * full 6x glow would span the whole frame and wash out the stars, so
 * that view shrinks it to hug the limb.
 */
// Surface brightness multipliers (meshBasicMaterial.color, toneMapped
// off, so components >1 push the texture toward white). Day mode reads
// noticeably brighter/whiter against the light gradient; night gets a
// subtler lift.
const DAY_TINT = new THREE.Color(1.55, 1.55, 1.7);
const NIGHT_TINT = new THREE.Color(1.12, 1.12, 1.15);
const ENTER_TEXT = "ENTER";
const ENTER_FONT_SIZE_SVG = 22;
/** Enlarge the curved "ENTER" label relative to its SVG-derived size */
const ENTER_TEXT_SCALE = 1.5;
/** Push the label off the sun's surface by ~10% of the sun's diameter */
const ENTER_SURFACE_OFFSET = 0.2 * SUN_RADIUS;
/** SunInternals #circle2 — the textPath the SVG "ENTER" link follows */
const ENTER_RING_OUTER_RADIUS = 200 * SUN_SIZE;
const ENTER_FONT = retroFloralFont(ENTER_FONT_SIZE_SVG);
const ENTER_TEXT_COLOR = new THREE.Color("#ffffff");
const ENTER_DAY_COLOR = new THREE.Color("#412596");
const ENTER_HOVER_COLOR = new THREE.Color("#9e80f9");
/** Fade duration for the landing-intro reveal of the ENTER label */
const ENTER_REVEAL_SECONDS = 0.8;

const letterBasis = new THREE.Matrix4();
const tangentAxis = new THREE.Vector3();
const radialAxis = new THREE.Vector3();
const upAxis = new THREE.Vector3(0, 1, 0);

/**
 * Orient a glyph flat in the XZ plane (facing the top-down camera) with its
 * baseline along the circle tangent at `angle`, so the word curves around the
 * sun the way an SVG textPath does.
 */
function orientLetter(quaternion: THREE.Quaternion, angle: number) {
  tangentAxis.set(-Math.sin(angle), 0, Math.cos(angle));
  radialAxis.set(Math.cos(angle), 0, Math.sin(angle));
  letterBasis.makeBasis(tangentAxis, radialAxis, upAxis);
  quaternion.setFromRotationMatrix(letterBasis);
}

/** Curved "ENTER" text above the sun, matching the landing SVG textPath. */
function EnterRing({
  isNightMode,
  revealed,
}: {
  isNightMode: boolean;
  /** Fades the label in (the landing intro reveals it after the planets) */
  revealed: boolean;
}) {
  const fontReady = useRetroFloralReady(ENTER_FONT);
  const opacity = useRef(revealed ? 1 : 0);

  const letters = useMemo((): CurvedLetter[] | null => {
    if (!fontReady) return null;

    const charWidths = measureCharWidths(
      ENTER_TEXT,
      ENTER_FONT,
      ENTER_FONT_SIZE_SVG * 0.6,
    );
    const totalWidth = charWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth <= 0) return null;

    const worldFontSize =
      SUN_RADIUS *
      (ENTER_FONT_SIZE_SVG / SUN_SURFACE_RADIUS) *
      ENTER_TEXT_SCALE;
    // Float the ring off the sun's surface by ~10% of its diameter so the
    // (now larger) word clears the limb instead of grazing it.
    const worldRadius =
      SUN_RADIUS * (ENTER_RING_OUTER_RADIUS / SUN_SURFACE_RADIUS) +
      ENTER_SURFACE_OFFSET;
    const worldArcLength = totalWidth * (worldFontSize / ENTER_FONT_SIZE_SVG);
    const totalAngle = worldArcLength / worldRadius;
    // Center the word at the top of the screen (−Z is screen-up for the
    // top-down landing camera); increasing angle runs left→right.
    let angle = -Math.PI / 2 - totalAngle / 2;

    return charWidths.map((width, index) => {
      const char = ENTER_TEXT[index] ?? "";
      const letterArc = (width / totalWidth) * totalAngle;
      angle += letterArc / 2;

      const letter = createLetterPlane(
        char,
        width,
        ENTER_FONT_SIZE_SVG,
        worldFontSize,
        ENTER_FONT,
      );
      letter.position.set(
        Math.cos(angle) * worldRadius,
        0.04,
        Math.sin(angle) * worldRadius,
      );
      orientLetter(letter.quaternion, angle);

      angle += letterArc / 2;
      return letter;
    });
  }, [fontReady]);

  useEffect(
    () => () => {
      letters?.forEach(({ material, geometry }) => {
        material.map?.dispose();
        material.dispose();
        geometry.dispose();
      });
    },
    [letters],
  );

  useFrame((_, delta) => {
    if (!letters) return;
    opacity.current = THREE.MathUtils.clamp(
      opacity.current + (revealed ? delta : -delta) / ENTER_REVEAL_SECONDS,
      0,
      1,
    );
    const base = isNightMode ? ENTER_TEXT_COLOR : ENTER_DAY_COLOR;
    const target = hoverState.sun ? ENTER_HOVER_COLOR : base;
    const ease = Math.min(1, delta * 10);
    for (const { material } of letters) {
      material.color.lerp(target, ease);
      material.opacity = opacity.current;
    }
  });

  if (!letters) return null;

  return (
    <group>
      {letters.map(({ material, geometry, position, quaternion }, index) => (
        <mesh
          key={index}
          geometry={geometry}
          material={material}
          position={position}
          quaternion={quaternion}
          renderOrder={50}
        />
      ))}
    </group>
  );
}

export default function Sun({
  targetScale = 1,
  targetGlowScale = 6,
  isNightMode,
  showEnterRing = false,
  enterRevealed = true,
}: {
  targetScale?: number;
  /** Glow sprite size as a multiple of SUN_RADIUS (eased) */
  targetGlowScale?: number;
  isNightMode: boolean;
  /** Landing-only curved "ENTER" link label */
  showEnterRing?: boolean;
  /** Fades the ENTER label in during the landing intro */
  enterRevealed?: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const enterScaler = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const glow = useRef<THREE.Sprite>(null);
  const materialRef = useRef<THREE.MeshBasicMaterial>(null);
  const spotsMaterialRef = useRef<THREE.MeshBasicMaterial>(null);
  const texture = useMemo(() => createSunTexture(), []);
  // A second, independently-random blotch layer: crossfading it in and
  // out over the base makes the surface spots slowly shift
  const spotsTexture = useMemo(() => createSunTexture(), []);
  const glowTexture = useMemo(() => createSunGlowTexture(), []);

  useEffect(
    () => () => {
      texture.dispose();
      spotsTexture.dispose();
      glowTexture.dispose();
    },
    [texture, spotsTexture, glowTexture],
  );

  useFrame(({ clock }, delta) => {
    if (mesh.current) mesh.current.rotation.y += delta * 0.013;
    if (spotsMaterialRef.current) {
      // Slow morph between the two blotch patterns (~30s round trip)
      spotsMaterialRef.current.opacity =
        0.5 + 0.5 * Math.sin((clock.elapsedTime * Math.PI * 2) / 30);
    }
    const ease = Math.min(1, delta * 2.5);
    if (group.current) {
      const current = group.current.scale.x;
      const next = current + (targetScale - current) * ease;
      group.current.scale.setScalar(next);
      sunState.scale = next;
      enterScaler.current?.scale.setScalar(next);
    }
    if (glow.current) {
      // Hovering the ENTER link (or the sun itself) swells the glow
      const target = SUN_RADIUS * targetGlowScale * (hoverState.sun ? 1.35 : 1);
      const current = glow.current.scale.x;
      const next = current + (target - current) * ease;
      glow.current.scale.set(next, next, 1);
    }
    if (materialRef.current) {
      // Ease the brightness so the mode toggle doesn't pop; the spot
      // layer follows the same tint or the crossfade would pulse dark
      materialRef.current.color.lerp(isNightMode ? NIGHT_TINT : DAY_TINT, ease);
      if (spotsMaterialRef.current) {
        spotsMaterialRef.current.color.copy(materialRef.current.color);
      }
    }
  });

  return (
    <>
      <group ref={group}>
        <mesh ref={mesh}>
          <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
          <meshBasicMaterial
            ref={materialRef}
            map={texture}
            toneMapped={false}
          />
          {/* Crossfading spot layer, drawn just over the base surface */}
          <mesh scale={1.001} renderOrder={1}>
            <sphereGeometry args={[SUN_RADIUS, 64, 64]} />
            <meshBasicMaterial
              ref={spotsMaterialRef}
              map={spotsTexture}
              toneMapped={false}
              transparent
              opacity={0}
              depthWrite={false}
            />
          </mesh>
        </mesh>
        {/* soft corona billboard */}
        <sprite ref={glow} scale={[SUN_RADIUS * 6, SUN_RADIUS * 6, 1]}>
          <spriteMaterial
            map={glowTexture}
            transparent
            depthWrite={false}
            blending={THREE.AdditiveBlending}
          />
        </sprite>
        {/* the sun is the scene's light source */}
        <pointLight intensity={900} distance={0} decay={2} color="#fff2d5" />
      </group>
      {showEnterRing && (
        <group ref={enterScaler}>
          <EnterRing isNightMode={isNightMode} revealed={enterRevealed} />
        </group>
      )}
    </>
  );
}
