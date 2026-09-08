import * as THREE from "three";

import { registerMaterialHook } from "./materialHooks";

/**
 * A band of light that sweeps across a body: the mechanism the energy
 * wave (energyWave.ts) is built on. Rather than a separate mesh it is
 * folded into each part's own material — a shader hook adds a soft band
 * to the lit color wherever the surface crosses a plane sliding across
 * the body — so the sweep follows every part's true shape (the
 * satellite's tapered legs, the pen's barrel, the vase's curve, Earth's
 * globe) and is masked by the part's own alpha. One shared uniform set
 * drives every part a band covers, so it crosses them all as a single
 * sweep; a material can carry several bands (the satellite's legs take
 * both its body wave and its parts wave), each with its own uniforms.
 */

export interface ShimmerUniforms {
  /** World point the sweep is measured from (the satellite's center) */
  origin: { value: THREE.Vector3 };
  /** Unit world vector the band slides along */
  direction: { value: THREE.Vector3 };
  /** The band's center along `direction`, world units from `origin` */
  offset: { value: number };
  /** Distance from the band's center to its edge, world units */
  halfWidth: { value: number };
  /** Peak brightness added at the band's core (0 hides it) */
  strength: { value: number };
  color: { value: THREE.Color };
}

export function createShimmerUniforms(color = "#ffcf5c"): ShimmerUniforms {
  return {
    origin: { value: new THREE.Vector3() },
    direction: { value: new THREE.Vector3(1, 0, 0) },
    offset: { value: 0 },
    halfWidth: { value: 1 },
    strength: { value: 0 },
    color: { value: new THREE.Color(color) },
  };
}

const VERTEX_HEADER = /* glsl */ `
varying vec3 vShimmerWorld;
`;
// `transformed` is the object-space position once begin_vertex (and any
// morph/skin steps) have run; modelMatrix is in every built-in material
const VERTEX_BODY = /* glsl */ `
vShimmerWorld = ( modelMatrix * vec4( transformed, 1.0 ) ).xyz;
`;
const FRAGMENT_VARYING = /* glsl */ `
varying vec3 vShimmerWorld;
`;
// Per band, `i` numbering its uniforms
const fragmentHeader = (i: number) => /* glsl */ `
uniform vec3 uShimmerOrigin${i};
uniform vec3 uShimmerDirection${i};
uniform float uShimmerOffset${i};
uniform float uShimmerHalfWidth${i};
uniform float uShimmerStrength${i};
uniform vec3 uShimmerColor${i};
`;
// Squared so the band has a bright core and soft shoulders. Added to the
// lit color just before it is written out, after every lighting step and
// before the alpha, so the part's own transparency masks it.
const fragmentBody = (i: number) => /* glsl */ `
{
  float shimmerAlong =
    dot( vShimmerWorld - uShimmerOrigin${i}, uShimmerDirection${i} ) - uShimmerOffset${i};
  float shimmerBand =
    1.0 - smoothstep( 0.0, uShimmerHalfWidth${i}, abs( shimmerAlong ) );
  outgoingLight += uShimmerColor${i} * ( uShimmerStrength${i} * shimmerBand * shimmerBand );
}
`;

/** Hook one or more bands into a built-in material (MeshBasic /
 *  MeshStandard). Call before the material's first render. Composes with
 *  the wire skin (materialHooks.ts) — the band is added after it, so it
 *  sweeps over the wires rather than under them. */
export function applyShimmer(
  material: THREE.Material,
  bands: ShimmerUniforms[],
): void {
  const uniforms: Record<string, THREE.IUniform> = {};
  bands.forEach((band, i) => {
    uniforms[`uShimmerOrigin${i}`] = band.origin;
    uniforms[`uShimmerDirection${i}`] = band.direction;
    uniforms[`uShimmerOffset${i}`] = band.offset;
    uniforms[`uShimmerHalfWidth${i}`] = band.halfWidth;
    uniforms[`uShimmerStrength${i}`] = band.strength;
    uniforms[`uShimmerColor${i}`] = band.color;
  });
  registerMaterialHook(material, {
    // The band count is part of the key: the GLSL below is generated per
    // band, so a one-band material must not be handed a two-band program
    key: `shimmer:${bands.length}`,
    order: "add",
    uniforms,
    vertexHeader: VERTEX_HEADER,
    vertexBody: VERTEX_BODY,
    fragmentHeader:
      FRAGMENT_VARYING + bands.map((_, i) => fragmentHeader(i)).join(""),
    fragmentBody: bands.map((_, i) => fragmentBody(i)).join(""),
  });
}
