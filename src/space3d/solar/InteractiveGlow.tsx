import React, { useEffect, useMemo, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

import { createInteractiveGlowTexture } from "../textures";

/**
 * Always-on "you can click this" halo for the interactive bodies (the
 * link asteroids, the satellite, Earth's /about link, the moon's video
 * link): an additive purple sprite in the site's accent color — distinct
 * from the bodies' natural palette — that breathes gently so it reads as
 * an affordance rather than atmosphere. Bodies pass their fade/reveal
 * ref so the halo follows their opacity, and `enabled` gates the
 * view-scoped links (Earth is only clickable on home, the moon on
 * about).
 */

/** Sprite width as a multiple of the body's radius */
const HALO_SCALE = 3.4;
const PULSE_SPEED = 1.6;
const ENABLE_FADE_PER_SECOND = 2;

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia("(prefers-reduced-motion: reduce)").matches;

export default function InteractiveGlow({
  radius,
  opacityRef,
  enabled = true,
  strength = 0.45,
}: {
  radius: number;
  /** The body's own fade/reveal opacity (0..1), followed per frame */
  opacityRef?: React.MutableRefObject<number>;
  /** View-scoped links (Earth, the moon) turn the halo off elsewhere */
  enabled?: boolean;
  strength?: number;
}) {
  const texture = useMemo(() => createInteractiveGlowTexture(), []);
  const material = useMemo(
    () =>
      new THREE.SpriteMaterial({
        map: texture,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        opacity: 0,
      }),
    [texture],
  );
  const enableEase = useRef(enabled ? 1 : 0);

  useEffect(
    () => () => {
      material.dispose();
      texture.dispose();
    },
    [material, texture],
  );

  useFrame(({ clock }, delta) => {
    enableEase.current = THREE.MathUtils.clamp(
      enableEase.current + (enabled ? delta : -delta) * ENABLE_FADE_PER_SECOND,
      0,
      1,
    );
    const pulse = prefersReducedMotion
      ? 1
      : 0.8 + 0.2 * Math.sin(clock.elapsedTime * PULSE_SPEED);
    material.opacity =
      strength * pulse * enableEase.current * (opacityRef?.current ?? 1);
  });

  return (
    <sprite
      material={material}
      scale={[radius * HALO_SCALE, radius * HALO_SCALE, 1]}
    />
  );
}
