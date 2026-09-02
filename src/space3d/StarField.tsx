import React, {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
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
  generateStarsForText,
  INTRO_SCATTER_PX,
  starPhrases,
  starPhrasesSmall,
  type SampledStar,
  type TextStarLayout,
  type TextStarOptions,
} from "./starSampling";
import { domToWorldX, domToWorldY, Z_STARS } from "./SpaceCanvas";
import { starPanState } from "./starPan";
import { JOURNEY_BODY_CLASS, journeyState } from "../rocketJourney";
import { nameHighlightState } from "../nameHighlight";
import { NAME_TITLE_ID } from "../solarAnchorIds";

/**
 * GPU star field. Replaces the legacy DOM/SVG stars (one element per star,
 * re-rendered through React every 45ms) with THREE.Points clouds:
 * - background stars: fully static buffers, animated in the shader only
 *   (twinkle/disco pulse + the global 20s hue rotation that used to be a
 *   fullscreen CSS filter)
 * - text stars: same glyph layout and cursor-gravity behavior as before,
 *   but simulated into a Float32Array each frame with zero React work.
 * - name stars: the "andrewhunt" header on every page past the landing —
 *   the text stars' glyph sampling minus the cursor gravity (NameStars).
 */

// The legacy interval advanced the phrase 3 times, then stopped (ending
// back on the first phrase).
const MAX_PHRASE_TRANSITIONS = 3;

const HUE_ROTATION_PERIOD_S = 20; // starsHueAnim: 20s per full rotation
const DISCO_PERIOD_S = 8; // star-disco: 4s alternate = 8s round trip

// The shader inherited the CSS stars' looping animations (hue rotation,
// disco pulse) — and their prefers-reduced-motion coverage comes with
// them (the App.scss reduced-motion block suppresses the CSS twins).
// One-shot fades stay, twinkle is sub-pixel; the endless loops stop.
const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

const HALO_FACTOR = 3; // sprite is 3x the dot diameter, for the glow halo

// Twinkle (aTwinkle 0..1, the name header): the star's sprite is grown
// TWINKLE_GROW× on the CPU (aSize) so the sparkle rays have room, while
// the shader pulls the dot's core back in so it only grows TWINKLE_DOT_GROW×
// instead of ballooning with the sprite.
const TWINKLE_GROW = 2.5;
const TWINKLE_DOT_GROW = 1.6;

// Extra wrap range beyond the viewport so big sprites drift fully
// offscreen before re-entering on the far side instead of popping
const PAN_WRAP_PAD_PX = 160;

const vertexShader = /* glsl */ `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aPhase;
  attribute float aDisco;
  attribute float aBrighten;
  attribute float aTwinkle;
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uMaxPointSize;
  uniform vec2 uPan;
  uniform vec2 uWrap;
  varying vec3 vColor;
  varying float vExtraHue;
  varying float vTwinkle;

  void main() {
    vTwinkle = aTwinkle;
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
  varying float vTwinkle;

  // One sparkle ray: \`across\` is the distance off the ray's line, \`along\`
  // the distance from the center along it (sprite units, 0..0.5). Thin,
  // tapering to nothing at the sprite edge.
  float ray(float across, float along) {
    float taper = pow(max(0.0, 1.0 - along * 2.0), 0.8);
    return 1.5 * exp(-across * 25.0) * taper;
  }

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
    // While twinkling the sprite is TWINKLE_GROW× bigger, so the core
    // thresholds shrink to keep the dot near its size (see TWINKLE_GROW).
    float coreScale = mix(
      1.0,
      ${TWINKLE_DOT_GROW.toFixed(1)} / (1.0 + ${TWINKLE_GROW.toFixed(1)}),
      vTwinkle
    );
    float core = 1.0 - smoothstep(0.34 * coreScale, 0.42 * coreScale, d);
    float halo = exp(-d * 5.0) * uGlowStrength * (1.0 - core);
    // Four-point sparkle (plus faint diagonals) that fades with the twinkle
    vec2 a = abs(p);
    vec2 q = abs(vec2(p.x + p.y, p.x - p.y)) * 0.7071;
    float spark = vTwinkle * (
      ray(a.x, a.y) + ray(a.y, a.x) + 0.5 * (ray(q.x, q.y) + ray(q.y, q.x))
    );
    float hue = uHue + vExtraHue;
    vec3 color = hueRotate(vColor, hue) * core
      + hueRotate(uGlowColor, hue) * halo
      + vec3(1.0) * spark;
    float alpha = (core + halo + spark) * uOpacity;
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
  twinkles: Float32Array;
  positionsAttr: THREE.BufferAttribute;
  sizesAttr: THREE.BufferAttribute;
  brightensAttr: THREE.BufferAttribute;
  twinklesAttr: THREE.BufferAttribute;
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
  const twinklesAttr = make(1, "aTwinkle");
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
    twinkles: twinklesAttr.array as Float32Array,
    positionsAttr,
    sizesAttr,
    brightensAttr,
    twinklesAttr,
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
    material.uniforms.uHue.value = prefersReducedMotion
      ? 0
      : ((state.clock.elapsedTime / HUE_ROTATION_PERIOD_S) % 1) * Math.PI * 2;
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

// Faint purple halo, like the legacy .star box-shadow (text + name stars)
const TEXT_GLOW_COLOR = "#ab8ffd";
const TEXT_GLOW_STRENGTH = 0.25;

/** The legacy sim moved a text star 1–10 px per 45ms tick */
const clampStep = (step: number) => Math.max(1, Math.min(10, step));

/**
 * One tick of a text star's spring back toward its glyph position along
 * one axis: speed grows with distance² (STAR_MOVEMENT_SPEED_MULTIPLIER),
 * clamped to the legacy 1–10 px per tick and scaled by the frame's tick
 * fraction. Shared by the landing title and the name header.
 */
const glideToward = (
  pos: number,
  target: number,
  velocity: number,
  factor: number,
) => {
  if (pos === target) return pos;
  const step =
    clampStep(velocity * (pos - target) ** 2 * STAR_MOVEMENT_SPEED_MULTIPLIER) *
    factor;
  const movement = Math.min(Math.abs(pos - target), step);
  return pos > target ? pos - movement : pos + movement;
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
      b.discos[i] = !prefersReducedMotion && star.widthPx < 1.05 ? 1 : 0;
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
    () => createStarMaterial(TEXT_GLOW_COLOR, TEXT_GLOW_STRENGTH),
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

      if (isCloseToCursor) {
        // Same per-tick clamp as the glide, driven by cursor proximity
        const pull =
          clampStep(
            (data.velocities[i] * 10000) /
              Math.pow(Math.max(distanceToCursor, 10), 2),
          ) * factor;
        const xMovement = Math.min(pull, Math.abs(x - cursorX));
        const yMovement = Math.min(pull, Math.abs(y - cursorY));
        x -= x - cursorX > 0 ? xMovement : -xMovement;
        y -= y - cursorY > 0 ? yMovement : -yMovement;
      } else {
        // Glide back to the glyph position
        x = glideToward(x, originalX, data.velocities[i], factor);
        y = glideToward(y, originalY, data.velocities[i], factor);
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

// ─── The "andrewhunt" name header ────────────────────────────────────────
// Off the landing page the name at the top of every page is the landing
// title's glyph-sampled stars, laid out over the .nameTitle SVG (which
// fades out at night but keeps the day-mode letters, the accessible text
// and — the part this reads — the responsive box). Not interactive: no
// cursor gravity, just the roving letter highlight AppBackground's ticker
// drives, a random twinkle, and a one-shot assemble on mount. Thinned and
// dimmed so it reads as a header rather than the show.
const NAME_TEXT = "ANDREWHUNT";
const NAME_STAR_OPACITY = 0.7;
/** Stars per px of letter width; the landing title runs at 1 */
const NAME_STAR_DENSITY = 0.85;
/** Floor on stars per letter — phone-sized glyphs dissolve below this */
const NAME_MIN_STARS_PER_LETTER = 45;
/** Smaller dots than the landing title's 1.5–2.5px */
const NAME_STAR_RADIUS_SCALE = 0.8;
/** The landing intro in miniature: assemble from a tight scatter */
const NAME_INTRO_SCATTER_PX = 50;
/** The highlighted letter's stars swell and whiten a touch (the SVG's
 *  shimmer, kept subtle) */
const NAME_HIGHLIGHT_SWELL = 0.3;
const NAME_HIGHLIGHT_BRIGHTEN = 22;
/** Twinkle: every 0.5–1.5s (random) one random star flares — a quick
 *  attack to white with a four-point sparkle (the shader's aTwinkle rays)
 *  and a TWINKLE_GROW× sprite, then it fades back to its own color */
const NAME_TWINKLE_GAP_MIN_S = 0.5;
const NAME_TWINKLE_GAP_MAX_S = 1.5;
const NAME_TWINKLE_ATTACK_S = 0.1;
const NAME_TWINKLE_HOLD_S = 0.15;
const NAME_TWINKLE_DECAY_S = 0.6;
const twinkleGap = () =>
  NAME_TWINKLE_GAP_MIN_S +
  Math.random() * (NAME_TWINKLE_GAP_MAX_S - NAME_TWINKLE_GAP_MIN_S);
/** Letter size from the box height (the CSS fixes the box's aspect per
 *  breakpoint), capped so the whole name always fits the width */
const NAME_LETTER_HEIGHT_FRACTION = 0.55;
const NAME_MAX_TEXT_WIDTH_FRACTION = 0.85;
/** Below this letter width the dots shrink with the glyphs, or their
 *  halos merge phone-sized letters into blobs */
const NAME_FULL_RADIUS_LETTER_PX = 48;

const nameStarLayout = (
  box: DOMRect,
): { layout: TextStarLayout; options: TextStarOptions } => {
  const n = NAME_TEXT.length;
  const letterWidth = Math.min(
    box.height * NAME_LETTER_HEIGHT_FRACTION,
    (box.width * NAME_MAX_TEXT_WIDTH_FRACTION) / n,
  );
  const textWidth = letterWidth * n;
  return {
    // Letters spread edge to edge, like the SVG's textLength="100%"
    layout: {
      x: box.left,
      y: box.top,
      textWidth,
      letterSpacing: (box.width - textWidth) / (n - 1),
    },
    options: {
      density: Math.max(
        NAME_STAR_DENSITY,
        NAME_MIN_STARS_PER_LETTER / letterWidth,
      ),
      radiusScale:
        NAME_STAR_RADIUS_SCALE *
        Math.min(1, letterWidth / NAME_FULL_RADIUS_LETTER_PX),
    },
  };
};

const NameStars = ({
  opacityRef,
}: {
  opacityRef: React.MutableRefObject<number>;
}) => {
  const { width, height } = useWindowWidth();

  // The SVG's box is the layout: it already carries the responsive
  // margins, the safe-area inset and the per-breakpoint aspect ratio
  const [box, setBox] = useState<DOMRect | null>(null);
  useLayoutEffect(() => {
    const svg = document.getElementById(NAME_TITLE_ID);
    setBox(svg ? svg.getBoundingClientRect() : null);
  }, [width, height]);

  const targets: SampledStar[] = useMemo(() => {
    if (!box) return [];
    const { layout, options } = nameStarLayout(box);
    return generateStarsForText(NAME_TEXT, layout, options);
  }, [box]);

  // Only the first layout assembles from a scatter; a resize re-samples
  // the glyphs in place
  const introPlayedRef = useRef(false);

  const data = useMemo(() => {
    const count = targets.length;
    const scatter = introPlayedRef.current ? 0 : NAME_INTRO_SCATTER_PX;
    // Live positions (DOM px, xy pairs) + per-star glide speed
    const positions = new Float32Array(count * 2);
    const velocities = new Float32Array(count);
    const buffers = createStarGeometry(count, width + height, true);
    for (let i = 0; i < count; i++) {
      velocities[i] = Math.random() + 0.5;
      positions[i * 2] = targets[i].x + (Math.random() * 2 - 1) * scatter;
      positions[i * 2 + 1] = targets[i].y + (Math.random() * 2 - 1) * scatter;
      buffers.positions[i * 3] = domToWorldX(positions[i * 2], width);
      buffers.positions[i * 3 + 1] = domToWorldY(positions[i * 2 + 1], height);
      buffers.positions[i * 3 + 2] = Z_STARS;
      writeColor(buffers.colors, i * 3, targets[i].color);
      buffers.sizes[i] = targets[i].r;
      buffers.phases[i] = Math.random();
    }
    return {
      buffers,
      positions,
      velocities,
      assembled: scatter === 0,
    };
  }, [targets, width, height]);

  useEffect(() => {
    if (data.positions.length > 0) introPlayedRef.current = true;
  }, [data]);

  const material = useMemo(
    () => createStarMaterial(TEXT_GLOW_COLOR, TEXT_GLOW_STRENGTH),
    [],
  );

  useEffect(() => () => data.buffers.geometry.dispose(), [data]);
  useEffect(() => () => material.dispose(), [material]);

  // The header's own fade: the star field's fade, muted, and hidden with
  // the rest of the page chrome while a lightspeed ride or the Zip video
  // plays (the CSS hides the SVG the same way)
  const fadeRef = useRef(0);
  const simRef = useRef({
    chromeVisible: 1,
    // Per-letter highlight, eased so the march shimmers instead of blinks
    glow: new Float32Array(NAME_TEXT.length),
    elapsed: 0,
    nextTwinkleAt: twinkleGap(),
    twinkles: [] as { star: number; start: number }[],
  });

  // Registered before useConfigureMaterial's frame hook so the fade it
  // reads is this frame's
  useFrame((_, delta) => {
    const sim = simRef.current;
    const chromeHidden =
      document.body.classList.contains("video-mode") ||
      document.body.classList.contains(JOURNEY_BODY_CLASS);
    sim.chromeVisible +=
      ((chromeHidden ? 0 : 1) - sim.chromeVisible) * Math.min(1, delta * 4);
    fadeRef.current =
      opacityRef.current * NAME_STAR_OPACITY * sim.chromeVisible;
    // Fully faded out (day mode): the group is hidden, skip the sim
    if (opacityRef.current <= 0.001) return;
    const count = targets.length;
    if (count === 0) return;

    // Clamped so a backgrounded tab doesn't replay a burst of twinkles
    // (and glide) on return
    const dt = Math.min(delta, 0.1);
    sim.elapsed += dt;
    const factor = (dt * 1000) / STAR_TICK_MS;
    const highlighted = nameHighlightState.letter;
    const ease = Math.min(1, delta * 10);
    for (let l = 0; l < sim.glow.length; l++) {
      sim.glow[l] += ((l === highlighted ? 1 : 0) - sim.glow[l]) * ease;
    }

    const { buffers, positions, velocities } = data;
    // Per-star twinkle level (0..1) — the shader's aTwinkle, written here
    const twinkle = buffers.twinkles;

    // Twinkles: a random star flashes to white and fades back. A
    // continuous loop, so it rests under prefers-reduced-motion like the
    // shader's hue cycle.
    if (!prefersReducedMotion && sim.elapsed >= sim.nextTwinkleAt) {
      sim.twinkles.push({
        star: Math.floor(Math.random() * count),
        start: sim.elapsed,
      });
      sim.nextTwinkleAt = sim.elapsed + twinkleGap();
    }
    for (let t = sim.twinkles.length - 1; t >= 0; t--) {
      const { star, start } = sim.twinkles[t];
      const age = sim.elapsed - start;
      // Lifetime by age, not by level: a twinkle is born at level 0 and
      // must survive its first frame to ramp up
      const decayStart = NAME_TWINKLE_ATTACK_S + NAME_TWINKLE_HOLD_S;
      const done = age >= decayStart + NAME_TWINKLE_DECAY_S;
      // Envelope: quick attack, brief hold at full, then the fade back
      const level = done
        ? 0
        : age < NAME_TWINKLE_ATTACK_S
          ? age / NAME_TWINKLE_ATTACK_S
          : age < decayStart
            ? 1
            : 1 - (age - decayStart) / NAME_TWINKLE_DECAY_S;
      // A resize can shrink the star count under a live twinkle
      if (star < count) twinkle[star] = level;
      if (done) sim.twinkles.splice(t, 1);
    }

    let settled = true;
    for (let i = 0; i < count; i++) {
      const target = targets[i];
      if (!data.assembled) {
        const x = glideToward(
          positions[i * 2],
          target.x,
          velocities[i],
          factor,
        );
        const y = glideToward(
          positions[i * 2 + 1],
          target.y,
          velocities[i],
          factor,
        );
        positions[i * 2] = x;
        positions[i * 2 + 1] = y;
        if (x !== target.x || y !== target.y) settled = false;
        buffers.positions[i * 3] = domToWorldX(x, width);
        buffers.positions[i * 3 + 1] = domToWorldY(y, height);
      }
      const glow = sim.glow[target.letter];
      const flash = twinkle[i];
      buffers.sizes[i] =
        target.r * (1 + NAME_HIGHLIGHT_SWELL * glow + TWINKLE_GROW * flash);
      // aBrighten is % of white mixed in: 100 = pure white at the peak
      buffers.brightens[i] = NAME_HIGHLIGHT_BRIGHTEN * glow + 100 * flash;
    }
    if (!data.assembled) {
      buffers.positionsAttr.needsUpdate = true;
      if (settled) data.assembled = true;
    }
    buffers.sizesAttr.needsUpdate = true;
    buffers.brightensAttr.needsUpdate = true;
    buffers.twinklesAttr.needsUpdate = true;
  });

  useConfigureMaterial(material, fadeRef);

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
      {/* Mounted per visit off the landing, so the name re-assembles on
          each return from the solar system */}
      {!isLanding && <NameStars opacityRef={opacityRef} />}
    </group>
  );
};

export default StarField;
