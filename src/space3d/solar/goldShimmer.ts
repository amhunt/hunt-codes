import * as THREE from "three";

/**
 * The gold glint that sweeps across the satellite's link parts on
 * /projects-and-toys (Satellite.tsx): the "these are clickable" tell,
 * independent of the hover wash. Rather than a separate mesh it is folded
 * into each part's own material — a shader hook adds a soft gold band to
 * the lit color wherever the surface crosses a plane sliding across the
 * body — so the glint follows every part's true shape (the tapered legs,
 * the pen's barrel, the vase's curve) and is masked by the part's own
 * alpha. One shared uniform set drives every part, so the band crosses
 * the whole satellite as a single sweep.
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
const FRAGMENT_HEADER = /* glsl */ `
uniform vec3 uShimmerOrigin;
uniform vec3 uShimmerDirection;
uniform float uShimmerOffset;
uniform float uShimmerHalfWidth;
uniform float uShimmerStrength;
uniform vec3 uShimmerColor;
varying vec3 vShimmerWorld;
`;
// Squared so the band has a bright core and soft shoulders. Added to the
// lit color just before it is written out, after every lighting step and
// before the alpha, so the part's own transparency masks it.
const FRAGMENT_BODY = /* glsl */ `
{
  float shimmerAlong =
    dot( vShimmerWorld - uShimmerOrigin, uShimmerDirection ) - uShimmerOffset;
  float shimmerBand =
    1.0 - smoothstep( 0.0, uShimmerHalfWidth, abs( shimmerAlong ) );
  outgoingLight += uShimmerColor * ( uShimmerStrength * shimmerBand * shimmerBand );
}
`;

/** Hook the glint into a built-in material (MeshBasic / MeshStandard).
 *  Call before the material's first render. */
export function applyGoldShimmer(
  material: THREE.Material,
  uniforms: ShimmerUniforms,
): void {
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uShimmerOrigin = uniforms.origin;
    shader.uniforms.uShimmerDirection = uniforms.direction;
    shader.uniforms.uShimmerOffset = uniforms.offset;
    shader.uniforms.uShimmerHalfWidth = uniforms.halfWidth;
    shader.uniforms.uShimmerStrength = uniforms.strength;
    shader.uniforms.uShimmerColor = uniforms.color;
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>${VERTEX_HEADER}`)
      .replace(
        "#include <project_vertex>",
        `#include <project_vertex>${VERTEX_BODY}`,
      );
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>${FRAGMENT_HEADER}`)
      .replace(
        "#include <opaque_fragment>",
        `${FRAGMENT_BODY}#include <opaque_fragment>`,
      );
  };
}
