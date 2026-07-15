import React, { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { useFrame, useThree } from "@react-three/fiber";
import tinycolor from "tinycolor2";

import useWindowWidth from "../useWindowWidth";
import { useCursorPositionRef } from "../hooks/useCursorPosition";
import {
  CURSOR_DISABLED_BUFFER_ZONE_PX,
  DEFAULT_CURSOR_GRAVITY_RADIUS_PX,
  maxStarRadiusPx,
  STAR_INTRO_DELAY_MS,
  STAR_MOVEMENT_SPEED_MULTIPLIER,
  STAR_TICK_MS,
  STAR_TO_CURSOR_TRIGGER_DISTANCE_PX,
  TEXT_CHANGE_INTERVAL_MS,
} from "../stars/starUtils";
import {
  generateBackgroundStars,
  generateStarsForLetters,
  INTRO_SCATTER_PX,
  starPhrases,
  starPhrasesSmall,
  type SampledStar,
} from "./starSampling";
import { domToWorldX, domToWorldY, Z_STARS } from "./SpaceCanvas";
import { starPanState } from "./starPan";
import { journeyState } from "../rocketJourney";

/**
 * GPU star field. Replaces the legacy DOM/SVG stars (one element per star,
 * re-rendered through React every 45ms) with two THREE.Points clouds:
 * - background stars: fully static buffers, animated in the shader only
 *   (twinkle/disco pulse + the global 20s hue rotation that used to be a
 *   fullscreen CSS filter)
 * - text stars: same glyph layout and cursor-gravity behavior as before,
 *   but simulated into a Float32Array each frame with zero React work.
 */

// The legacy interval advanced the phrase 3 times, then stopped (ending
// back on the first phrase).
const MAX_PHRASE_TRANSITIONS = 3;

const HUE_ROTATION_PERIOD_S = 20; // starsHueAnim: 20s per full rotation
const DISCO_PERIOD_S = 8; // star-disco: 4s alternate = 8s round trip

const HALO_FACTOR = 3; // sprite is 3x the dot diameter, for the glow halo

// Extra wrap range beyond the viewport so big sprites drift fully
// offscreen before re-entering on the far side instead of popping
const PAN_WRAP_PAD_PX = 160;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aDisco;
  attribute float aBrighten;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMaxPointSize;
  uniform vec2 uPan;
  uniform vec2 uWrap;
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
    // Camera-rotation parallax (starPan.ts): shift by the accumulated pan
    // and wrap around the padded viewport so the field is endless. uWrap
    // stays 0 for the text stars, which must hold their glyph positions.
    vec3 pos = position;
    if (uWrap.x > 0.5) {
      pos.xy = mod(pos.xy + uPan + 0.5 * uWrap, uWrap) - 0.5 * uWrap;
    }
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = min(
      aSize * 1.5 * ${HALO_FACTOR.toFixed(1)} * scale * uPixelRatio,
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
    // The dot core fills 1/HALO_FACTOR of the sprite; the rest is glow.
    // A slightly larger, softer-edged core makes the stars read bigger.
    float core = 1.0 - smoothstep(0.34, 0.42, d);
    float halo = exp(-d * 5.0) * uGlowStrength * (1.0 - core);
    float hue = uHue + vExtraHue;
    vec3 color = hueRotate(vColor, hue) * core + hueRotate(uGlowColor, hue) * halo;
    float alpha = (core + halo) * uOpacity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(color, alpha);
  }
`;

/** Write a CSS color into a Float32Array as 0..1 RGB at the given offset. */
const writeColor = (array: Float32Array, offset: number, color: string) => {
  const { r, g, b } = tinycolor(color).toRgb();
  array[offset] = r / 255;
  array[offset + 1] = g / 255;
  array[offset + 2] = b / 255;
};

const createStarMaterial = (glowColor: string, glowStrength: number) => {
  const glow = new Float32Array(3);
  writeColor(glow, 0, glowColor);
  return new THREE.ShaderMaterial({
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
      uGlowColor: { value: new THREE.Vector3(glow[0], glow[1], glow[2]) },
      uGlowStrength: { value: glowStrength },
      uPan: { value: new THREE.Vector2() },
      uWrap: { value: new THREE.Vector2() },
    },
  });
};

interface StarBuffers {
  geometry: THREE.BufferGeometry;
  positions: Float32Array;
  colors: Float32Array;
  sizes: Float32Array;
  phases: Float32Array;
  discos: Float32Array;
  brightens: Float32Array;
  positionsAttr: THREE.BufferAttribute;
  sizesAttr: THREE.BufferAttribute;
  brightensAttr: THREE.BufferAttribute;
}

/** The one place that knows the star shader's per-vertex attribute layout. */
const createStarGeometry = (
  count: number,
  extent: number,
  dynamic: boolean,
): StarBuffers => {
  const geometry = new THREE.BufferGeometry();
  const make = (itemSize: number, name: string) => {
    const attr = new THREE.BufferAttribute(
      new Float32Array(count * itemSize),
      itemSize,
    );
    if (dynamic) attr.setUsage(THREE.DynamicDrawUsage);
    geometry.setAttribute(name, attr);
    return attr;
  };
  const positionsAttr = make(3, "position");
  const colorsAttr = make(3, "aColor");
  const sizesAttr = make(1, "aSize");
  const phasesAttr = make(1, "aPhase");
  const discosAttr = make(1, "aDisco");
  const brightensAttr = make(1, "aBrighten");
  // Points are spread across the whole screen; skip per-frame culling math
  geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(), extent);
  return {
    geometry,
    positions: positionsAttr.array as Float32Array,
    colors: colorsAttr.array as Float32Array,
    sizes: sizesAttr.array as Float32Array,
    phases: phasesAttr.array as Float32Array,
    discos: discosAttr.array as Float32Array,
    brightens: brightensAttr.array as Float32Array,
    positionsAttr,
    sizesAttr,
    brightensAttr,
  };
};

/** Per-frame uniform updates + the GPU's max point-sprite size cap.
 *  `pansWithCamera` opts the material into the solar camera's rotation
 *  parallax (background stars only — text stars hold their glyphs). */
const useConfigureMaterial = (
  material: THREE.ShaderMaterial,
  opacityRef: React.MutableRefObject<number>,
  pansWithCamera = false,
) => {
  const gl = useThree((s) => s.gl);
  // Chases journeyState.starDim so the stars ease back even when the
  // ride ends abruptly (an aborted warp hard-resets the dim to 0)
  const journeyDim = useRef(0);
  useEffect(() => {
    const ctx = gl.getContext();
    // getParameter is untyped (any); ALIASED_POINT_SIZE_RANGE yields [min, max]
    const range = ctx.getParameter(
      ctx.ALIASED_POINT_SIZE_RANGE,
    ) as Float32Array | null;
    if (range?.[1]) {
      material.uniforms.uMaxPointSize.value = range[1];
    }
  }, [gl, material]);

  useFrame((state, delta) => {
    material.uniforms.uTime.value = state.clock.elapsedTime;
    material.uniforms.uHue.value =
      ((state.clock.elapsedTime / HUE_ROTATION_PERIOD_S) % 1) * Math.PI * 2;
    material.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    // The rocket joyride dims the point stars while its warp streaks
    // play (static dots under a lightspeed jump would give the trick away)
    journeyDim.current +=
      (journeyState.starDim - journeyDim.current) * Math.min(1, delta * 5);
    material.uniforms.uOpacity.value =
      opacityRef.current * (1 - journeyDim.current);
    if (pansWithCamera) {
      (material.uniforms.uPan.value as THREE.Vector2).set(
        starPanState.x,
        starPanState.y,
      );
      (material.uniforms.uWrap.value as THREE.Vector2).set(
        state.size.width + PAN_WRAP_PAD_PX,
        state.size.height + PAN_WRAP_PAD_PX,
      );
    }
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

  const buffers = useMemo(() => {
    const stars = generateBackgroundStars(width, height, isLanding);
    const b = createStarGeometry(stars.length, width + height, false);
    stars.forEach((star, i) => {
      b.positions[i * 3] = domToWorldX(star.x, width);
      b.positions[i * 3 + 1] = domToWorldY(star.y, height);
      b.positions[i * 3 + 2] = Z_STARS;
      writeColor(b.colors, i * 3, star.color);
      // The legacy stars were divs whose *width* was this value, so the
      // visual radius is half of it (text stars use SVG circle r)
      b.sizes[i] = star.widthPx / 2;
      b.phases[i] = Math.random();
      // Legacy: the smallest stars get the "disco" pulse animation
      b.discos[i] = star.widthPx < 1.05 ? 1 : 0;
    });
    return b;
  }, [width, height, isLanding]);

  const material = useMemo(
    // Reddish halo, like the legacy .star_background box-shadow
    () => createStarMaterial("rgb(210, 99, 99)", 0.4),
    [],
  );

  // Background stars pan/wrap with the solar camera's rotation, so the
  // sky turns with the co-rotating home and about views
  useConfigureMaterial(material, opacityRef, true);

  useEffect(() => () => buffers.geometry.dispose(), [buffers]);
  useEffect(() => () => material.dispose(), [material]);

  return <points geometry={buffers.geometry} material={material} />;
};

const TextStars = ({
  isLanding,
  opacityRef,
}: {
  isLanding: boolean;
  opacityRef: React.MutableRefObject<number>;
}) => {
  const { width, height, isSmall } = useWindowWidth();
  const cursorRef = useCursorPositionRef();

  const [phraseIdx, setPhraseIdx] = useState(0);
  const phrases = isSmall ? starPhrasesSmall : starPhrases;
  const phrase = phrases[phraseIdx % phrases.length];

  // Off the landing page there are no text stars, but the component stays
  // mounted so the intro/phrase choreography doesn't replay on every
  // route return (matching the legacy always-mounted Stars component).
  const targets: SampledStar[] = useMemo(
    () => (isLanding ? generateStarsForLetters(phrase, width) : []),
    [isLanding, phrase, width],
  );

  // Choreography state persists across phrase changes and route hops
  const simRef = useRef({
    hasEverHadStars: false,
    numCloseToCursor: 0,
    elapsedMs: 0,
    transitions: 0,
  });
  // Live star positions (DOM px, xy pairs); written every frame, read by
  // the next phrase's useMemo for carry-over. The memo itself stays pure —
  // the commit happens in the effect below.
  const livePositionsRef = useRef(new Float32Array(0));

  const data = useMemo(() => {
    const count = targets.length;
    const sim = simRef.current;
    const prev = livePositionsRef.current;
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      velocities[i] = Math.random() + 0.5;
      if (i * 2 + 1 < prev.length && sim.hasEverHadStars) {
        // Carry over live positions; stars glide to the new phrase's glyphs
        positions[i * 2] = prev[i * 2];
        positions[i * 2 + 1] = prev[i * 2 + 1];
      } else if (sim.hasEverHadStars) {
        // Extra stars for a longer phrase start on their target (legacy)
        positions[i * 2] = targets[i].x;
        positions[i * 2 + 1] = targets[i].y;
      } else {
        // Landing intro: scatter around the glyphs, then assemble
        positions[i * 2] =
          targets[i].x +
          Math.random() * INTRO_SCATTER_PX * 2 -
          INTRO_SCATTER_PX;
        positions[i * 2 + 1] =
          targets[i].y +
          Math.random() * INTRO_SCATTER_PX * 2 -
          INTRO_SCATTER_PX;
      }
    }

    const buffers = createStarGeometry(count, width + height, true);
    for (let i = 0; i < count; i++) {
      buffers.positions[i * 3] = domToWorldX(positions[i * 2], width);
      buffers.positions[i * 3 + 1] = domToWorldY(positions[i * 2 + 1], height);
      buffers.positions[i * 3 + 2] = Z_STARS;
      writeColor(buffers.colors, i * 3, targets[i].color);
      buffers.sizes[i] = targets[i].r;
      buffers.phases[i] = Math.random();
    }
    return { buffers, positions, velocities };
  }, [targets, width, height]);

  // Commit the new sim arrays outside of render
  useEffect(() => {
    livePositionsRef.current = data.positions;
    if (data.positions.length > 0) simRef.current.hasEverHadStars = true;
  }, [data]);

  const material = useMemo(
    // Faint purple halo, like the legacy .star box-shadow
    () => createStarMaterial("#ab8ffd", 0.25),
    [],
  );

  useConfigureMaterial(material, opacityRef);

  useEffect(() => () => data.buffers.geometry.dispose(), [data]);
  useEffect(() => () => material.dispose(), [material]);

  useFrame((_, delta) => {
    // Fully faded out (day mode, canvas persists for the sun): the whole
    // group is hidden, so don't burn CPU on the gravity sim either
    if (opacityRef.current <= 0.001) return;
    const sim = simRef.current;
    const deltaMs = Math.min(delta * 1000, 100);
    sim.elapsedMs += deltaMs;
    // Legacy choreography: stars sit scattered for 2s before assembling
    if (sim.elapsedMs < STAR_INTRO_DELAY_MS) return;

    // Phrase cycle: advance every 10s, 3 times total, ending on phrase 0
    if (
      sim.transitions < MAX_PHRASE_TRANSITIONS &&
      sim.elapsedMs - STAR_INTRO_DELAY_MS >
        (sim.transitions + 1) * TEXT_CHANGE_INTERVAL_MS
    ) {
      sim.transitions++;
      setPhraseIdx((idx) => (idx + 1) % phrases.length);
    }

    const count = targets.length;
    const positions = data.positions;
    if (count === 0 || positions.length < count * 2) return;

    // The legacy sim stepped once per 45ms; scale movement to keep the
    // same speed at any frame rate (just smoother).
    const factor = deltaMs / STAR_TICK_MS;

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
      const distanceToCursor = Math.sqrt(
        (x - cursorX) ** 2 + (y - cursorY) ** 2,
      );
      const isCloseToCursor =
        distanceToCursor < DEFAULT_CURSOR_GRAVITY_RADIUS_PX;
      if (isCloseToCursor) numClose++;

      const originalX = targets[i].x;
      const originalY = targets[i].y;

      const closeToCursorPull = isCloseToCursor
        ? 10000 / Math.pow(Math.max(distanceToCursor, 10), 2)
        : null;

      const uncappedChangeX =
        data.velocities[i] *
        (closeToCursorPull ??
          (x - originalX) ** 2 * STAR_MOVEMENT_SPEED_MULTIPLIER);
      const changeX = Math.max(1, Math.min(10, uncappedChangeX)) * factor;
      const uncappedChangeY =
        data.velocities[i] *
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
          maxStarRadiusPx,
        );
        if (distanceToCursor < 10) {
          size = Math.max(size, Math.min(prevNumClose / 16, 32));
          brighten = prevNumClose;
        }
      }

      data.buffers.positions[i * 3] = domToWorldX(x, width);
      data.buffers.positions[i * 3 + 1] = domToWorldY(y, height);
      data.buffers.sizes[i] = size;
      data.buffers.brightens[i] = brighten;
    }

    sim.numCloseToCursor = numClose;
    data.buffers.positionsAttr.needsUpdate = true;
    data.buffers.sizesAttr.needsUpdate = true;
    data.buffers.brightensAttr.needsUpdate = true;
  });

  return <points geometry={data.buffers.geometry} material={material} />;
};

// Hold the stars hidden for a beat after mount before the fade-in starts
// (part of the landing intro choreography)
const FADE_IN_DELAY_SECONDS = 2;

const StarField = ({ isLanding, opacityTarget }: StarFieldProps) => {
  // Shared fade value, ramped in the frame loop (mount fade-in ~1s after
  // the delay above, day/night switch fade-out ~0.6s to match the legacy
  // CSS transitions).
  const opacityRef = useRef(0);
  const targetRef = useRef(opacityTarget);
  const delayRef = useRef(FADE_IN_DELAY_SECONDS);
  const groupRef = useRef<THREE.Group>(null);
  targetRef.current = opacityTarget;

  useFrame((_, delta) => {
    // Stars mount at opacity 0, so burning the delay first postpones only
    // the initial reveal — later day/night fades are unaffected
    if (delayRef.current > 0) {
      delayRef.current -= Math.min(delta, 0.1);
      if (groupRef.current) groupRef.current.visible = false;
      return;
    }
    const target = targetRef.current;
    const rate = target > opacityRef.current ? 1 : 1.6;
    const step = Math.min(delta, 0.1) * rate;
    opacityRef.current =
      target > opacityRef.current
        ? Math.min(target, opacityRef.current + step)
        : Math.max(target, opacityRef.current - step);
    // The canvas persists through day mode (for the sun) — skip drawing
    // the fully-faded stars instead of rasterizing invisible points
    if (groupRef.current) {
      groupRef.current.visible = opacityRef.current > 0.001;
    }
  });

  return (
    <group ref={groupRef}>
      <BackgroundStars isLanding={isLanding} opacityRef={opacityRef} />
      <TextStars isLanding={isLanding} opacityRef={opacityRef} />
    </group>
  );
};

export default StarField;
