import React, { useEffect, useMemo, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

import { projectBody, type ProjectedBody } from "./projection";
import { liveElementById } from "../svgTracking";
import {
  SYNTH_KNOBS,
  SYNTH_ORIGIN,
  SYNTH_SUN_ANCHOR_ID,
  synthKnobAnchorId,
  synthUiState,
  type SynthKnobSpec,
} from "../../synthSpec";
import { getParam, synthState } from "../../synthAudio";

/**
 * The synth solar system (/synth): a second, stranger system parked far
 * below the real one — a magenta sun that pulses with the beat, ringed
 * by six knob-planets, one per synth parameter. The planets ARE the
 * knobs: their DOM overlays (Synth.tsx) take the pointer input, and
 * this scene answers back — a planet spins faster the higher its value
 * and glows while grabbed.
 *
 * The overlay gluing is BodyAnchors' pattern, run locally: every frame
 * each knob planet (and the sun's play button) is projected through the
 * camera and its overlay is positioned around it. Mounted only on the
 * synth view, and everything fades in on arrival.
 */

const SUN_RADIUS = 2.2;
const REVEAL_SECONDS = 1.2;
/** Planets sway a few degrees around their bearing instead of orbiting
 *  away — knobs that wander off-screen aren't knobs */
const SWAY_RADIANS = 0.06;
const SWAY_RATE = 0.13;

/**
 * Stepper planets (the wave selector) wear their current option: the
 * waveform is drawn as a glowing oscilloscope trace wrapping the
 * equator, so the planet itself displays the shape it's set to. One
 * texture per step, index-aligned with the spec's stepNames.
 */
const WAVE_TEXTURE_W = 512;
const WAVE_TEXTURE_H = 256;
const WAVE_CYCLES = 4;

function createWaveTexture(shape: string): THREE.CanvasTexture {
  const canvas = document.createElement("canvas");
  canvas.width = WAVE_TEXTURE_W;
  canvas.height = WAVE_TEXTURE_H;
  const ctx = canvas.getContext("2d")!;
  const midY = WAVE_TEXTURE_H / 2;
  const amp = WAVE_TEXTURE_H * 0.2;
  const period = WAVE_TEXTURE_W / WAVE_CYCLES;

  // Oscilloscope face: near-black screen with a faint axis line
  ctx.fillStyle = "#141b2a";
  ctx.fillRect(0, 0, WAVE_TEXTURE_W, WAVE_TEXTURE_H);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.12)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, midY);
  ctx.lineTo(WAVE_TEXTURE_W, midY);
  ctx.stroke();

  ctx.strokeStyle = "#dff1ff";
  ctx.lineWidth = 8;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.beginPath();
  if (shape === "sine") {
    for (let x = 0; x <= WAVE_TEXTURE_W; x += 2) {
      const y = midY - amp * Math.sin((x / period) * Math.PI * 2);
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
  } else {
    for (let c = 0; c < WAVE_CYCLES; c++) {
      const x0 = c * period;
      if (shape === "triangle") {
        // 0 -> +amp -> -amp -> 0, tiling cleanly across cycles
        if (c === 0) ctx.moveTo(x0, midY);
        ctx.lineTo(x0 + period * 0.25, midY - amp);
        ctx.lineTo(x0 + period * 0.75, midY + amp);
        ctx.lineTo(x0 + period, midY);
      } else if (shape === "saw") {
        // Ramp up, vertical drop
        if (c === 0) ctx.moveTo(x0, midY + amp);
        ctx.lineTo(x0 + period, midY - amp);
        ctx.lineTo(x0 + period, midY + amp);
      } else {
        // square: high half, low half, hard edges
        if (c === 0) ctx.moveTo(x0, midY - amp);
        ctx.lineTo(x0 + period * 0.5, midY - amp);
        ctx.lineTo(x0 + period * 0.5, midY + amp);
        ctx.lineTo(x0 + period, midY + amp);
        if (c < WAVE_CYCLES - 1) ctx.lineTo(x0 + period, midY - amp);
      }
    }
  }
  ctx.stroke();

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

const ORIGIN = new THREE.Vector3(
  SYNTH_ORIGIN.x,
  SYNTH_ORIGIN.y,
  SYNTH_ORIGIN.z,
);

// scratch values, reused every frame
const worldPos = new THREE.Vector3();
const projected: ProjectedBody = { x: 0, y: 0, projR: 0, inFront: false };

/** Position the overlay element around the body's projection (the
 *  BodyAnchors recipe). */
function glueOverlay(
  el: HTMLElement,
  persp: THREE.PerspectiveCamera,
  size: { width: number; height: number },
  radius: number,
  ringScale: number,
  minSizePx: number,
) {
  projectBody(persp, size, worldPos, radius, projected);
  if (!projected.inFront) {
    el.style.visibility = "hidden";
    return;
  }
  const sizePx = Math.max(2 * projected.projR * ringScale, minSizePx);
  el.style.position = "fixed";
  el.style.margin = "0";
  el.style.left = `${projected.x - sizePx / 2}px`;
  el.style.top = `${projected.y - sizePx / 2}px`;
  el.style.width = `${sizePx}px`;
  el.style.height = `${sizePx}px`;
  el.style.visibility = "visible";
}

function KnobPlanet({
  spec,
  index,
  orbitColor,
  reveal,
}: {
  spec: SynthKnobSpec;
  index: number;
  orbitColor: string;
  reveal: React.MutableRefObject<number>;
}) {
  const group = useRef<THREE.Group>(null);
  const mesh = useRef<THREE.Mesh>(null);
  const surface = useRef<THREE.MeshStandardMaterial>(null);
  const orbitMaterial = useRef<THREE.LineBasicMaterial>(null);
  const glow = useRef(0);

  // Stepper planets carry one oscilloscope texture per option; the
  // frame loop swaps the active one in as the value changes
  const stepTextures = useMemo(
    () => spec.stepNames?.map((name) => createWaveTexture(name)) ?? null,
    [spec.stepNames],
  );
  useEffect(
    () => () => stepTextures?.forEach((texture) => texture.dispose()),
    [stepTextures],
  );
  const appliedStep = useRef(-1);

  const orbitLine = useMemo(() => {
    const points: THREE.Vector3[] = [];
    for (let i = 0; i <= 128; i++) {
      const a = (i / 128) * Math.PI * 2;
      points.push(
        new THREE.Vector3(
          Math.cos(a) * spec.orbitRadius,
          0,
          Math.sin(a) * spec.orbitRadius,
        ),
      );
    }
    return new THREE.BufferGeometry().setFromPoints(points);
  }, [spec.orbitRadius]);
  useEffect(() => () => orbitLine.dispose(), [orbitLine]);

  useFrame(({ clock }, delta) => {
    const t = clock.elapsedTime;
    const value = getParam(spec.param);

    if (group.current) {
      const phase =
        spec.orbitPhase + SWAY_RADIANS * Math.sin(t * SWAY_RATE + index * 1.7);
      group.current.position.set(
        Math.cos(phase) * spec.orbitRadius,
        0,
        Math.sin(phase) * spec.orbitRadius,
      );
    }
    // The knob's value is legible from orbit: higher = faster spin.
    // Steppers scroll at a steady readable pace instead — their spin
    // is a ticker for the oscilloscope trace, not a value display.
    if (mesh.current) {
      mesh.current.rotation.y +=
        delta * (stepTextures ? 0.55 : 0.3 + value * 2.2);
    }
    if (surface.current) {
      const active = synthUiState.activeKnob === spec.param;
      glow.current +=
        ((active ? 1 : 0) - glow.current) * Math.min(delta * 6, 1);
      // Steppers glow bright and flat — the texture IS the display
      surface.current.emissiveIntensity = stepTextures
        ? (0.8 + glow.current * 0.4) * reveal.current
        : (0.22 + value * 0.25 + glow.current * 0.5) * reveal.current;
      surface.current.opacity = reveal.current;
      // Show the currently selected waveform on the planet's face
      if (stepTextures) {
        const step = Math.round(value * (stepTextures.length - 1));
        if (step !== appliedStep.current) {
          appliedStep.current = step;
          surface.current.map = stepTextures[step];
          surface.current.emissiveMap = stepTextures[step];
          surface.current.needsUpdate = true;
        }
      }
    }
    if (orbitMaterial.current) {
      orbitMaterial.current.opacity = 0.22 * reveal.current;
    }
  });

  return (
    <>
      <lineLoop geometry={orbitLine}>
        <lineBasicMaterial
          ref={orbitMaterial}
          color={orbitColor}
          transparent
          opacity={0}
        />
      </lineLoop>
      <group ref={group}>
        {/* Steppers are tipped 90° so the equator — where the trace is
            drawn — faces the top-down camera instead of the blank pole;
            the mesh's own spin then scrolls the trace like a ticker */}
        <group rotation={stepTextures ? [Math.PI / 2, 0, 0] : [0, 0, 0]}>
          <mesh ref={mesh}>
            <sphereGeometry args={[spec.radius, 32, 24]} />
            {/* Steppers show their oscilloscope texture true-color (white
              base, white emissive so the trace glows); plain knobs get
              the spec's flat color treatment */}
            <meshStandardMaterial
              ref={surface}
              color={stepTextures ? "#ffffff" : spec.color}
              map={stepTextures ? stepTextures[0] : null}
              roughness={0.45}
              metalness={0.1}
              emissive={stepTextures ? "#ffffff" : spec.color}
              emissiveMap={stepTextures ? stepTextures[0] : null}
              emissiveIntensity={0}
              transparent
              opacity={0}
            />
          </mesh>
        </group>
      </group>
    </>
  );
}

export default function SynthSystem({ isNightMode }: { isNightMode: boolean }) {
  const size = useThree((s) => s.size);
  const sun = useRef<THREE.Mesh>(null);
  const sunMaterial = useRef<THREE.MeshStandardMaterial>(null);
  const glowMaterial = useRef<THREE.MeshBasicMaterial>(null);
  // Arrival fade, shared with every knob planet
  const reveal = useRef(0);

  useFrame(({ camera, clock }, delta) => {
    const t = clock.elapsedTime;
    reveal.current = Math.min(1, reveal.current + delta / REVEAL_SECONDS);

    // The beat: synthAudio spikes pulse to 1 on each note; decay it here
    // and swell the sun with it
    synthState.pulse = Math.max(0, synthState.pulse - delta * 2.4);
    const swell = 1 + 0.16 * synthState.pulse;
    if (sun.current) sun.current.scale.setScalar(swell);
    if (sunMaterial.current) {
      sunMaterial.current.emissiveIntensity =
        (1.1 + synthState.pulse * 0.9) * reveal.current;
      sunMaterial.current.opacity = reveal.current;
    }
    if (glowMaterial.current) {
      glowMaterial.current.opacity =
        (0.26 + synthState.pulse * 0.12) * reveal.current;
    }

    // Glue the /synth overlays to their bodies (BodyAnchors' job, done
    // locally for the synth system's own cast)
    const persp = camera as THREE.PerspectiveCamera;
    persp.updateMatrixWorld();
    for (let i = 0; i < SYNTH_KNOBS.length; i++) {
      const spec = SYNTH_KNOBS[i];
      const el = liveElementById(
        synthKnobAnchorId(spec.param),
      ) as HTMLElement | null;
      if (!el) continue;
      const phase =
        spec.orbitPhase + SWAY_RADIANS * Math.sin(t * SWAY_RATE + i * 1.7);
      worldPos.set(
        ORIGIN.x + Math.cos(phase) * spec.orbitRadius,
        ORIGIN.y,
        ORIGIN.z + Math.sin(phase) * spec.orbitRadius,
      );
      glueOverlay(el, persp, size, spec.radius, 1.5, 48);
    }
    const sunEl = liveElementById(SYNTH_SUN_ANCHOR_ID) as HTMLElement | null;
    if (sunEl) {
      worldPos.copy(ORIGIN);
      glueOverlay(sunEl, persp, size, SUN_RADIUS, 1.15, 64);
    }
  });

  return (
    <group position={[ORIGIN.x, ORIGIN.y, ORIGIN.z]}>
      {/* This system brings its own light — the real sun is 1600 units
          away and its point light doesn't reach */}
      <ambientLight intensity={0.3} />
      <pointLight color="#e6d4ff" intensity={2.2} decay={0} />
      <mesh ref={sun}>
        <sphereGeometry args={[SUN_RADIUS, 48, 32]} />
        <meshStandardMaterial
          ref={sunMaterial}
          color="#3a1f52"
          emissive="#c26bff"
          emissiveIntensity={0}
          roughness={0.6}
          transparent
          opacity={0}
        />
      </mesh>
      {/* Soft additive halo, same back-side-shell trick as the corona */}
      <mesh scale={1.6}>
        <sphereGeometry args={[SUN_RADIUS, 32, 24]} />
        <meshBasicMaterial
          ref={glowMaterial}
          color="#7a3fd1"
          transparent
          opacity={0}
          side={THREE.BackSide}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
      {SYNTH_KNOBS.map((spec, i) => (
        <KnobPlanet
          key={spec.param}
          spec={spec}
          index={i}
          orbitColor={isNightMode ? "#ffffff" : "#141428"}
          reveal={reveal}
        />
      ))}
    </group>
  );
}
