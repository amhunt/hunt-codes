import * as THREE from "three";

import { createShimmerUniforms, type ShimmerUniforms } from "./goldShimmer";

/**
 * The "this is clickable" energy wave: a purple band in the site's accent
 * color that washes over a body every few seconds, as if it were
 * transmitting. It is the resting affordance — it says a body is a link
 * before the cursor ever reaches it, and it rides alongside the hover
 * treatment rather than replacing it. Built on the shimmer band
 * (goldShimmer.ts), so it is folded into the body's own materials and
 * follows their true shape and alpha instead of being a separate mesh.
 *
 * The satellite pulses one down its leg axis on /home; Earth pulses one
 * up the screen there too. A caller creates a wave, hooks its `uniforms`
 * into every material it should cross (applyShimmer), then calls
 * `update` each frame with where the body is, which way the band should
 * travel, and whether the link is currently live — the ease on/off, the
 * sweep timing and the reduced-motion fallback (a faint steady tint
 * instead of a travelling band) all live in here.
 */

const prefersReducedMotion =
  typeof window !== "undefined" &&
  window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

export interface EnergyWaveConfig {
  /** The body's radius: the wave's whole geometry is measured in these */
  radius: number;
  color?: string;
  /** Seconds between pulses (the band rests off the body in between) */
  periodSeconds?: number;
  /** Seconds one pulse takes to cross the body */
  sweepSeconds?: number;
  /** Half the band's thickness, in radii */
  halfWidthRadii?: number;
  /** Peak brightness at the band's core */
  strength?: number;
  /** Reduced motion: the steady tint that stands in for the sweep */
  staticStrength?: number;
  /** Seconds the wave takes to ease in/out as the link comes and goes */
  easeSeconds?: number;
  /** Where the sweep starts and ends along its direction, in radii from
   *  the body's center. The band's own half width is added outside both,
   *  so it is fully clear of the body at each end of the run. */
  startRadii?: number;
  endRadii?: number;
}

export interface EnergyWaveFrame {
  /** Seconds on the shared clock */
  time: number;
  delta: number;
  /** Is the link live in this view? (eases the wave on/off) */
  active: boolean;
  /** The body's own fade/reveal opacity (0..1) */
  opacity: number;
  /** The body's world center */
  origin: THREE.Vector3;
  /** Unit world vector the band travels along */
  direction: THREE.Vector3;
}

export interface EnergyWave {
  /** Hook these into every material the wave should cross */
  uniforms: ShimmerUniforms;
  update(frame: EnergyWaveFrame): void;
}

export function createEnergyWave({
  radius,
  color = "#9e80f9",
  periodSeconds = 3.5,
  sweepSeconds = 1.1,
  halfWidthRadii = 0.4,
  strength = 0.75,
  staticStrength = 0.12,
  easeSeconds = 0.6,
  startRadii = -1,
  endRadii = 1,
}: EnergyWaveConfig): EnergyWave {
  const uniforms = createShimmerUniforms(color);
  /** 0..1: how much of the wave is showing (eased on/off with `active`) */
  let weight = 0;
  let started = false;

  return {
    uniforms,
    update({ time, delta, active, opacity, origin, direction }) {
      // First frame: sit at the resting value rather than easing up from
      // nothing (a link that is already live shouldn't fade in twice)
      if (!started) {
        started = true;
        weight = active ? 1 : 0;
      }
      const step = delta / easeSeconds;
      weight = THREE.MathUtils.clamp(weight + (active ? step : -step), 0, 1);

      uniforms.origin.value.copy(origin);
      uniforms.direction.value.copy(direction);
      const shown = weight * opacity;
      if (prefersReducedMotion) {
        // A band wide enough to cover the whole body evenly
        uniforms.offset.value = 0;
        uniforms.halfWidth.value = radius * 20;
        uniforms.strength.value = staticStrength * shown;
        return;
      }
      const halfWidth = radius * halfWidthRadii;
      const sweep = Math.min((time % periodSeconds) / sweepSeconds, 1);
      uniforms.offset.value = THREE.MathUtils.lerp(
        radius * startRadii - halfWidth,
        radius * endRadii + halfWidth,
        sweep,
      );
      uniforms.halfWidth.value = halfWidth;
      uniforms.strength.value = strength * shown;
    },
  };
}
