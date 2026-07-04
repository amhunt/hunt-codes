import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { EARTH, rigState } from "./constants";
import { hoverState } from "../../solarHover";
import {
  createLetterPlane,
  measureCharWidths,
  retroFloralFont,
  useRetroFloralReady,
  type CurvedLetter,
} from "./curvedText";

/**
 * The "ABOUT ME" link label curved over the top of Earth — the WebGL port of
 * the SVG textPath that SolarOverlays used to glue to Earth's projection. The
 * group billboards to face the camera each frame, so the word curves around
 * Earth in screen space (exactly like the flat SVG ring did) while living in
 * the 3D scene. The clickable hit target stays in the DOM (SolarOverlays),
 * since the canvas takes no pointer input.
 *
 * Sizes are derived from the old overlay so the label lands in the same spot:
 * BodyAnchors sized the overlay to 1.55× Earth's projected diameter, the SVG
 * text path sat at 41/50 of that radius, and the font was 13/100 of the
 * viewBox — all reproduced here in Earth-radius world units.
 */

const ABOUT_TEXT = "ABOUT ME";
const ABOUT_FONT_SIZE = 13; // matches the SVG textPath fontSize
const ABOUT_FONT = retroFloralFont(ABOUT_FONT_SIZE);
const ABOUT_RING_SCALE = 1.55; // BodyAnchors overlay diameter multiple
const ABOUT_PATH_RADIUS_FRAC = 41 / 50; // text path radius within the overlay
const ABOUT_FONT_FRAC = ABOUT_FONT_SIZE / 100; // font size as a viewBox fraction

const NIGHT_COLOR = new THREE.Color("#ffffff");
const DAY_COLOR = new THREE.Color("#412596");
const HOVER_COLOR = new THREE.Color("#9e80f9");

const xAxis = new THREE.Vector3();
const yAxis = new THREE.Vector3();
const zAxis = new THREE.Vector3(0, 0, 1);
const letterBasis = new THREE.Matrix4();

/**
 * Orient a glyph in the billboard's local XY plane (+Y is screen-up once the
 * group faces the camera) so its baseline follows the circle tangent at
 * `angle`, with the top of the letter pointing radially outward.
 */
function orientLetter(quaternion: THREE.Quaternion, angle: number) {
  // Reading direction (left→right along the top runs clockwise, i.e. toward
  // decreasing angle) and radial-outward "up" for the glyph.
  xAxis.set(Math.sin(angle), -Math.cos(angle), 0);
  yAxis.set(Math.cos(angle), Math.sin(angle), 0);
  letterBasis.makeBasis(xAxis, yAxis, zAxis);
  quaternion.setFromRotationMatrix(letterBasis);
}

export default function AboutRing({
  active,
  isNightMode,
}: {
  /** True on the home view — the label fades in once the camera settles */
  active: boolean;
  isNightMode: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const opacity = useRef(0);
  const fontReady = useRetroFloralReady(ABOUT_FONT);

  const letters = useMemo((): CurvedLetter[] | null => {
    if (!fontReady) return null;

    const charWidths = measureCharWidths(
      ABOUT_TEXT,
      ABOUT_FONT,
      ABOUT_FONT_SIZE * 0.6,
    );
    const totalWidth = charWidths.reduce((sum, width) => sum + width, 0);
    if (totalWidth <= 0) return null;

    const overlayRadius = EARTH.radius * ABOUT_RING_SCALE;
    const worldRadius = overlayRadius * ABOUT_PATH_RADIUS_FRAC;
    const worldFontSize = overlayRadius * 2 * ABOUT_FONT_FRAC;
    const worldArcLength = totalWidth * (worldFontSize / ABOUT_FONT_SIZE);
    const totalAngle = worldArcLength / worldRadius;
    // Center the word over the top of Earth (local +Y). Reading L→R runs
    // clockwise, so step through decreasing angle.
    let angle = Math.PI / 2 + totalAngle / 2;

    return charWidths.map((width, index) => {
      const char = ABOUT_TEXT[index] ?? "";
      const letterArc = (width / totalWidth) * totalAngle;
      angle -= letterArc / 2;

      const letter = createLetterPlane(
        char,
        width,
        ABOUT_FONT_SIZE,
        worldFontSize,
        ABOUT_FONT,
      );
      letter.position.set(
        Math.cos(angle) * worldRadius,
        Math.sin(angle) * worldRadius,
        0,
      );
      orientLetter(letter.quaternion, angle);

      angle -= letterArc / 2;
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

  useFrame(({ camera }, delta) => {
    // Billboard: match the camera's orientation so the ring always faces us
    if (group.current) group.current.quaternion.copy(camera.quaternion);
    if (!letters) return;

    // Fade in only once the camera settles on the home view (mirrors the old
    // DOM ring's opacity transition); fade back out otherwise.
    const targetOpacity = active && rigState.settled ? 1 : 0;
    opacity.current += (targetOpacity - opacity.current) * Math.min(1, delta * 4);

    const base = isNightMode ? NIGHT_COLOR : DAY_COLOR;
    const targetColor = hoverState.earth ? HOVER_COLOR : base;
    const colorEase = Math.min(1, delta * 10);
    for (const { material } of letters) {
      material.opacity = opacity.current;
      material.color.lerp(targetColor, colorEase);
    }
  });

  if (!letters) return null;

  return (
    <group ref={group}>
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
