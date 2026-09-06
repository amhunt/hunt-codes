import * as THREE from "three";

/**
 * A band of light that sweeps across the satellite (Satellite.tsx): the
 * gold glint over its link parts on /projects-and-toys — the "these are
 * clickable" tell, independent of the hover wash — and the purple energy
 * wave that washes over the whole body every few seconds on /home.
 * Rather than a separate mesh it is folded into each part's own material
 * — a shader hook adds a soft band to the lit color wherever the surface
 * crosses a plane sliding across the body — so the sweep follows every
 * part's true shape (the tapered legs, the pen's barrel, the vase's
 * curve) and is masked by the part's own alpha. One shared uniform set
 * drives every part a band covers, so it crosses the whole satellite as
 * a single sweep; a material can carry several bands (the legs take
 * both), each with its own uniforms.
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
 *  MeshStandard). Call before the material's first render. */
export function applyShimmer(
  material: THREE.Material,
  bands: ShimmerUniforms[],
): void {
  // Three keys its program cache on this hook's source text, which is
  // the same for every band count — so name the count, or a one-band
  // material would be handed a two-band program (or the reverse)
  material.customProgramCacheKey = () => `shimmer:${bands.length}`;
  material.onBeforeCompile = (shader) => {
    bands.forEach((uniforms, i) => {
      shader.uniforms[`uShimmerOrigin${i}`] = uniforms.origin;
      shader.uniforms[`uShimmerDirection${i}`] = uniforms.direction;
      shader.uniforms[`uShimmerOffset${i}`] = uniforms.offset;
      shader.uniforms[`uShimmerHalfWidth${i}`] = uniforms.halfWidth;
      shader.uniforms[`uShimmerStrength${i}`] = uniforms.strength;
      shader.uniforms[`uShimmerColor${i}`] = uniforms.color;
    });
    const headers = bands.map((_, i) => fragmentHeader(i)).join("");
    const bodies = bands.map((_, i) => fragmentBody(i)).join("");
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>${VERTEX_HEADER}`)
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>${VERTEX_BODY}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace(
        "#include <common>",
        `#include <common>${FRAGMENT_VARYING}${headers}`,
      )
      .replace(
        "#include <opaque_fragment>",
        `${bodies}#include <opaque_fragment>`,
      );
  };
}
