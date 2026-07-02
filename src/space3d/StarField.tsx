import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import tinycolor from "tinycolor2";

import useWindowWidth from "../useWindowWidth";
import { DEFAULT_CURSOR_GRAVITY_RADIUS_PX, maxStarRadiusPx } from "../stars/starUtils";
import {
  generateStarsForLetters,
  starPhrases,
  starPhrasesSmall,
  type SampledStar,
} from "./starSampling";
import { domToWorldX, domToWorldY, Z_STARS } from "./SpaceCanvas";

/**
 * GPU star field. Replaces the legacy DOM/SVG stars (one element per star,
 * re-rendered through React every 45ms) with two THREE.Points clouds:
 * - background stars: fully static buffers, animated in the shader only
 *   (twinkle/disco pulse + the global 20s hue rotation that used to be a
 *   fullscreen CSS filter)
 * - text stars: same glyph layout and cursor-gravity behavior as before,
 *   but simulated into a Float32Array each frame with zero React work.
 */

// --- Legacy behavior constants (from Stars.tsx / StarDot.tsx) ---
const LEGACY_TICK_MS = 45;
const STAR_MOVEMENT_SPEED_MULTIPLIER = 1 / 100;
const CURSOR_DISABLED_BUFFER_ZONE_PX = 20;
const STAR_TO_CURSOR_TRIGGER_DISTANCE_PX = 100;
const TEXT_CHANGE_INTERVAL_MS = 10000;
const SIM_ENABLE_DELAY_MS = 2000;
// The legacy interval advanced the phrase 3 times, then stopped (ending
// back on the first phrase).
const MAX_PHRASE_TRANSITIONS = 3;

const HUE_ROTATION_PERIOD_S = 20; // starsHueAnim: 20s per full rotation
const DISCO_PERIOD_S = 8; // star-disco: 4s alternate = 8s round trip

const HALO_FACTOR = 3.0; // sprite is 3x the dot diameter, for the glow halo

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aDisco;
  attribute float aBrighten;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMaxPointSize;
  varying vec3 vColor;
  varying float vExtraHue;

  void main() {
    float scale = 1.0;
    float extraHue = 0.0;
    if (aDisco > 0.5) {
      // star-disco: scale 1 -> 2.2 and hue-rotate 360deg, ease-in-out alternate
      float t = abs(fract(uTime / ${DISCO_PERIOD_S.toFixed(1)} + aPhase) * 2.0 - 1.0);
      t = smoothstep(0.0, 1.0, t);
      scale = mix(1.0, 2.2, t);
      extraHue = t * 6.2831853;
    }
    vExtraHue = extraHue;
    // tinycolor.brighten(n) adds n% of full white
    vColor = clamp(aColor + vec3(aBrighten * 0.01), 0.0, 1.0);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = min(
      aSize * 2.0 * ${HALO_FACTOR.toFixed(1)} * scale * uPixelRatio,
      uMaxPointSize
    );
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uOpacity;
  uniform float uHue;
  uniform vec3 uGlowColor;
  uniform float uGlowStrength;
  varying vec3 vColor;
  varying float vExtraHue;

  // CSS filter: hue-rotate() matrix (column-major)
  vec3 hueRotate(vec3 color, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    mat3 m = mat3(
      0.213 + 0.787 * c - 0.213 * s, 0.213 - 0.213 * c + 0.143 * s, 0.213 - 0.213 * c - 0.787 * s,
      0.715 - 0.715 * c - 0.715 * s, 0.715 + 0.285 * c + 0.140 * s, 0.715 - 0.715 * c + 0.715 * s,
      0.072 - 0.072 * c + 0.928 * s, 0.072 - 0.072 * c - 0.283 * s, 0.072 + 0.928 * c + 0.072 * s
    );
    return clamp(m * color, 0.0, 1.0);
  }

  void main() {
    vec2 p = gl_PointCoord - 0.5;
    float d = length(p) * 2.0; // 0 at center, 1 at sprite edge
    // The dot core fills 1/HALO_FACTOR of the sprite; the rest is glow
    float core = 1.0 - smoothstep(0.30, 0.36, d);
    float halo = exp(-d * 5.0) * uGlowStrength * (1.0 - core);
    float hue = uHue + vExtraHue;
    vec3 color = hueRotate(vColor, hue) * core + hueRotate(uGlowColor, hue) * halo;
    float alpha = (core + halo) * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

const createStarMaterial = (glowColor: string, glowStrength: number) =>
  new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    transparent: true,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uOpacity: { value: 0 },
      uHue: { value: 0 },
      uPixelRatio: { value: 1 },
      uMaxPointSize: { value: 256 },
      uGlowColor: { value: hexToVec3(glowColor) },
      uGlowStrength: { value: glowStrength },
    },
  });

function hexToVec3(hex: string): THREE.Vector3 {
  const { r, g, b } = tinycolor(hex).toRgb();
  return new THREE.Vector3(r / 255, g / 255, b / 255);
}

/** Cursor position in DOM px, kept in a ref so no React work per move. */
const useCursorRef = () => {
  const cursorRef = useRef<{ x: number; y: number } | null>(null);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      cursorRef.current = { x: e.pageX, y: e.pageY };
    };
    const onLeave = () => {
      cursorRef.current = null;
    };
    document.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("blur", onLeave, { passive: true });
    return () => {
      document.removeEventListener("mousemove", onMove);
      window.removeEventListener("blur", onLeave);
    };
  }, []);
  return cursorRef;
};

/** Query the GPU's max point sprite size once and cap sizes to it. */
const useConfigureMaterial = (
  material: THREE.ShaderMaterial,
  opacityRef: React.MutableRefObject<number>
) => {
  const gl = useThree((s) => s.gl);
  useEffect(() => {
    const ctx = gl.getContext();
    const range = ctx.getParameter(ctx.ALIASED_POINT_SIZE_RANGE);
    if (range && range[1]) {
      material.uniforms.uMaxPointSize.value = range[1];
    }
  }, [gl, material]);

  useFrame((state) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uHue.value =
      ((state.clock.elapsedTime / HUE_ROTATION_PERIOD_S) % 1) * Math.PI * 2;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    material.uniforms.uOpacity.value = opacityRef.current;
  });
};

interface StarFieldProps {
  isLanding: boolean;
  /** 1 = shown (night), 0 = fading out before unmount */
  opacityTarget: number;
}

const BackgroundStars = ({
  isLanding,
  opacityRef,
}: {
  isLanding: boolean;
  opacityRef: React.MutableRefObject<number>;
}) => {
  const { width, height } = useWindowWidth();

  const geometry = useMemo(() => {
    // 1-2 background stars per ten thousand pixels (legacy densities)
    const count = Math.round(width * height * (isLanding ? 0.0002 : 0.0001));
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const discos = new Float32Array(count);
    const brightens = new Float32Array(count); // always 0; shared shader

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      positions[i * 3] = domToWorldX(x, width);
      positions[i * 3 + 1] = domToWorldY(y, height);
      positions[i * 3 + 2] = Z_STARS;
      const { r, g, b } = tinycolor.random().brighten(20).toRgb();
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
      // Legacy background stars were divs whose *width* was this value,
      // so the visual radius is half of it (text stars use SVG circle r)
      const legacyWidth = Math.random() + 1;
      sizes[i] = legacyWidth / 2;
      phases[i] = Math.random();
      // Legacy: the smallest stars get the "disco" pulse animation
      discos[i] = legacyWidth < 1.05 ? 1 : 0;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", new THREE.BufferAttribute(sizes, 1));
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aDisco", new THREE.BufferAttribute(discos, 1));
    geo.setAttribute("aBrighten", new THREE.BufferAttribute(brightens, 1));
    // Points are spread across the whole screen; skip per-frame culling math
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), width + height);
    return geo;
  }, [width, height, isLanding]);

  const material = useMemo(
    // Reddish halo, like the legacy .star_background box-shadow
    () => createStarMaterial("rgb(210, 99, 99)", 0.4),
    []
  );

  useConfigureMaterial(material, opacityRef);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  return <points geometry={geometry} material={material} />;
};

const TextStars = ({
  opacityRef,
}: {
  opacityRef: React.MutableRefObject<number>;
}) => {
  const { width, height, isSmall } = useWindowWidth();
  const cursorRef = useCursorRef();

  const [phraseIdx, setPhraseIdx] = useState(0);
  const phrases = isSmall ? starPhrasesSmall : starPhrases;
  const phrase = phrases[phraseIdx % phrases.length];

  const targets: SampledStar[] = useMemo(
    () => generateStarsForLetters(phrase, width),
    [phrase, width]
  );

  // Sim state lives in refs/typed arrays; React only re-renders on phrase
  // or resize changes (every 10s at most).
  const simRef = useRef<{
    positions: Float32Array; // DOM px, xy pairs
    velocities: Float32Array;
    hasEverHadStars: boolean;
    numCloseToCursor: number;
    elapsedMs: number;
    transitions: number;
  }>({
    positions: new Float32Array(0),
    velocities: new Float32Array(0),
    hasEverHadStars: false,
    numCloseToCursor: 0,
    elapsedMs: 0,
    transitions: 0,
  });

  const { geometry, positionsAttr, sizeAttr, brightenAttr } = useMemo(() => {
    const count = targets.length;
    const sim = simRef.current;
    const prev = sim.positions;
    const next = new Float32Array(count * 2);
    for (let i = 0; i < count; i++) {
      if (i * 2 + 1 < prev.length && sim.hasEverHadStars) {
        // Carry over live positions; stars glide to the new phrase's glyphs
        next[i * 2] = prev[i * 2];
        next[i * 2 + 1] = prev[i * 2 + 1];
      } else if (sim.hasEverHadStars) {
        // Extra stars for a longer phrase start on their target (legacy)
        next[i * 2] = targets[i].x;
        next[i * 2 + 1] = targets[i].y;
      } else {
        // Landing intro: scatter around the glyphs, then assemble
        next[i * 2] = targets[i].x + Math.random() * 400 - 200;
        next[i * 2 + 1] = targets[i].y + Math.random() * 400 - 200;
      }
    }
    sim.positions = next;
    sim.hasEverHadStars = sim.hasEverHadStars || count > 0;
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) velocities[i] = Math.random() + 0.5;
    sim.velocities = velocities;

    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);
    const sizes = new Float32Array(count);
    const phases = new Float32Array(count);
    const discos = new Float32Array(count);
    const brightens = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = domToWorldX(next[i * 2], width);
      positions[i * 3 + 1] = domToWorldY(next[i * 2 + 1], height);
      positions[i * 3 + 2] = Z_STARS;
      const { r, g, b } = tinycolor(targets[i].color).toRgb();
      colors[i * 3] = r / 255;
      colors[i * 3 + 1] = g / 255;
      colors[i * 3 + 2] = b / 255;
      sizes[i] = targets[i].r;
      phases[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    const positionsAttr = new THREE.BufferAttribute(positions, 3);
    positionsAttr.setUsage(THREE.DynamicDrawUsage);
    const sizeAttr = new THREE.BufferAttribute(sizes, 1);
    sizeAttr.setUsage(THREE.DynamicDrawUsage);
    const brightenAttr = new THREE.BufferAttribute(brightens, 1);
    brightenAttr.setUsage(THREE.DynamicDrawUsage);
    geo.setAttribute("position", positionsAttr);
    geo.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    geo.setAttribute("aSize", sizeAttr);
    geo.setAttribute("aPhase", new THREE.BufferAttribute(phases, 1));
    geo.setAttribute("aDisco", new THREE.BufferAttribute(discos, 1));
    geo.setAttribute("aBrighten", brightenAttr);
    geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), width + height);
    return { geometry: geo, positionsAttr, sizeAttr, brightenAttr };
  }, [targets, width, height]);

  const material = useMemo(
    // Faint purple halo, like the legacy .star box-shadow
    () => createStarMaterial("#ab8ffd", 0.25),
    []
  );

  useConfigureMaterial(material, opacityRef);

  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    const sim = simRef.current;
    const deltaMs = Math.min(delta * 1000, 100);
    sim.elapsedMs += deltaMs;
    // Legacy choreography: stars sit scattered for 2s before assembling
    if (sim.elapsedMs < SIM_ENABLE_DELAY_MS) return;

    // Phrase cycle: advance every 10s, 3 times total, ending on phrase 0
    if (
      sim.transitions < MAX_PHRASE_TRANSITIONS &&
      sim.elapsedMs - SIM_ENABLE_DELAY_MS >
        (sim.transitions + 1) * TEXT_CHANGE_INTERVAL_MS
    ) {
      sim.transitions++;
      setPhraseIdx((idx) => (idx + 1) % phrases.length);
    }

    // The legacy sim stepped once per 45ms; scale movement to keep the
    // same speed at any frame rate (just smoother).
    const factor = deltaMs / LEGACY_TICK_MS;
    const count = targets.length;
    const positions = sim.positions;

    const cursor = cursorRef.current;
    const cursorUsable =
      cursor != null &&
      !isSmall &&
      cursor.x > CURSOR_DISABLED_BUFFER_ZONE_PX &&
      cursor.x < window.innerWidth - CURSOR_DISABLED_BUFFER_ZONE_PX &&
      cursor.y > CURSOR_DISABLED_BUFFER_ZONE_PX &&
      cursor.y < window.innerHeight - CURSOR_DISABLED_BUFFER_ZONE_PX;
    const cursorX = cursorUsable ? cursor.x : Number.POSITIVE_INFINITY;
    const cursorY = cursorUsable ? cursor.y : Number.POSITIVE_INFINITY;

    const prevNumClose = sim.numCloseToCursor;
    let numClose = 0;

    for (let i = 0; i < count; i++) {
      let x = positions[i * 2];
      let y = positions[i * 2 + 1];
      const distanceToCursor = Math.sqrt((x - cursorX) ** 2 + (y - cursorY) ** 2);
      const isCloseToCursor = distanceToCursor < DEFAULT_CURSOR_GRAVITY_RADIUS_PX;
      if (isCloseToCursor) numClose++;

      const originalX = targets[i].x;
      const originalY = targets[i].y;

      const closeToCursorPull = isCloseToCursor
        ? 10000 / Math.pow(Math.max(distanceToCursor, 10), 2)
        : null;

      const uncappedChangeX =
        sim.velocities[i] *
        (closeToCursorPull ??
          (x - originalX) ** 2 * STAR_MOVEMENT_SPEED_MULTIPLIER);
      const changeX = Math.max(1, Math.min(10, uncappedChangeX)) * factor;
      const uncappedChangeY =
        sim.velocities[i] *
        (closeToCursorPull ??
          (y - originalY) ** 2 * STAR_MOVEMENT_SPEED_MULTIPLIER);
      const changeY = Math.max(1, Math.min(10, uncappedChangeY)) * factor;

      if (isCloseToCursor) {
        const xMovement = Math.min(changeX, Math.abs(x - cursorX));
        const yMovement = Math.min(changeY, Math.abs(y - cursorY));
        x -= x - cursorX > 0 ? xMovement : -xMovement;
        y -= y - cursorY > 0 ? yMovement : -yMovement;
      } else {
        // Glide back to the glyph position
        if (x !== originalX) {
          const xMovement = Math.min(Math.abs(x - originalX), changeX);
          x += x > originalX ? -xMovement : xMovement;
        }
        if (y !== originalY) {
          const yMovement = Math.min(Math.abs(y - originalY), changeY);
          y += y > originalY ? -yMovement : yMovement;
        }
      }
      positions[i * 2] = x;
      positions[i * 2 + 1] = y;

      // Size swell + brightening near the cursor (legacy StarDot math)
      let size = targets[i].r;
      let brighten = 0;
      if (distanceToCursor < STAR_TO_CURSOR_TRIGGER_DISTANCE_PX) {
        size = Math.min(
          (Math.sqrt(STAR_TO_CURSOR_TRIGGER_DISTANCE_PX) /
            Math.sqrt(Math.max(distanceToCursor, 0.01))) *
            targets[i].r,
          maxStarRadiusPx
        );
        if (distanceToCursor < 10) {
          size = Math.max(size, Math.min(prevNumClose / 16, 32));
          brighten = prevNumClose;
        }
      }

      positionsAttr.array[i * 3] = domToWorldX(x, width);
      positionsAttr.array[i * 3 + 1] = domToWorldY(y, height);
      sizeAttr.array[i] = size;
      brightenAttr.array[i] = brighten;
    }

    sim.numCloseToCursor = numClose;
    positionsAttr.needsUpdate = true;
    sizeAttr.needsUpdate = true;
    brightenAttr.needsUpdate = true;
  });

  return <points geometry={geometry} material={material} />;
};

const StarField = ({ isLanding, opacityTarget }: StarFieldProps) => {
  // Shared fade value, ramped in the frame loop (mount fade-in ~1s,
  // day/night switch fade-out ~0.6s to match the legacy CSS transitions).
  const opacityRef = useRef(0);
  const targetRef = useRef(opacityTarget);
  targetRef.current = opacityTarget;

  useFrame((_, delta) => {
    const target = targetRef.current;
    const rate = target > opacityRef.current ? 1 : 1.6;
    const step = Math.min(delta, 0.1) * rate;
    opacityRef.current =
      target > opacityRef.current
        ? Math.min(target, opacityRef.current + step)
        : Math.max(target, opacityRef.current - step);
  });

  return (
    <>
      <BackgroundStars isLanding={isLanding} opacityRef={opacityRef} />
      {isLanding && <TextStars opacityRef={opacityRef} />}
    </>
  );
};

export default StarField;
