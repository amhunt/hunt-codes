import * as THREE from "three";

import { registerMaterialHook } from "./materialHooks";

/**
 * Mesh view's "wire skin": the patch that turns every solid body in the
 * scene into a glowing blue-white lattice.
 *
 * Rather than swapping materials or building wireframe geometry, each
 * body's own material grows a shader hook that paints a lat/long grid
 * derived from the fragment's object-space position, plus a fresnel rim
 * that lights the limb so a sphere still reads as a sphere. Two reasons
 * it's done this way: `EdgesGeometry` returns *zero* segments on a
 * sphere (every edge is under the angle threshold), and
 * `material.wireframe` on Earth's 96x96 globe is 54,720 line segments of
 * solid haze. A shader grid costs no extra draw calls and stays legible
 * because the line width is derivative-based — the same on a 147px Earth
 * on /home as on the /about close-up.
 *
 * Bodies are genuinely see-through in mesh view, not a grid painted on a
 * solid ball: the materials go additive with depth writing off, so the
 * far side's wires show through the near side and the sky reads between
 * them. Additive blending is commutative, so none of this depends on the
 * transparent sort order — which is what makes it safe to leave
 * `depthWrite` off. (Those three properties are the only thing about a
 * body that mesh view mutates; `wireState` restores them on the way
 * back.)
 */

/** 0 = space view (bodies untouched), 1 = fully meshed. The switch
 *  eases this across ~700ms; every skinned material reads the same
 *  uniform object, so one write per frame moves the whole scene. */
export const wireState = { amount: 0, target: 0 };

export const wireUniforms = {
  uWire: { value: 0 },
  uWireColor: { value: new THREE.Color("#bfe6ff") },
  /** Brightness of the rim light at the limb */
  uWireRim: { value: 0.55 },
};

interface WireSkinOptions {
  /** Meridians around the body */
  lon?: number;
  /** Parallels from pole to pole */
  lat?: number;
  /** Peak brightness of a wire */
  gain?: number;
  /** Pulls this body's wires off the shared blue-white toward a color of
   *  its own. The satellite's four part-links are told apart at that
   *  scale by hue as much as by shape, so they keep a trace of it —
   *  multiplied, not replaced, so everything still reads as one palette. */
  tint?: THREE.ColorRepresentation;
  /** Fold the material's emissive (the hover brighten every clickable
   *  body already animates) into the wire brightness. MeshStandard only —
   *  `totalEmissiveRadiance` doesn't exist in the basic material's
   *  program, so leaving this on for one would fail to link. */
  hover?: boolean;
}

const FRAGMENT_HEADER = /* glsl */ `
varying vec3 vWireObj;
varying vec3 vWireNormal;
varying vec3 vWireView;
uniform float uWire;
uniform vec3 uWireColor;
uniform float uWireRim;
uniform float uWireLat;
uniform float uWireLon;
uniform float uWireGain;
uniform vec3 uWireTint;

float wireGridLine( float coord ) {
  // Constant line width in screen space, whatever the body's size or
  // distance. The longitude seam (atan wrapping at +/-PI) spikes the
  // derivative; capping it turns that spike into "no line" rather than a
  // bright band across the globe.
  float w = min( fwidth( coord ), 0.35 );
  float d = abs( fract( coord - 0.5 ) - 0.5 ) / max( w, 1e-4 );
  return 1.0 - smoothstep( 0.0, 1.4, d );
}
`;

const VERTEX_HEADER = /* glsl */ `
varying vec3 vWireObj;
varying vec3 vWireNormal;
varying vec3 vWireView;
`;

const VERTEX_BODY = /* glsl */ `
vWireObj = transformed;
vWireNormal = normalize( normalMatrix * normal );
vWireView = ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz;
`;

const fragmentBody = (hover: boolean) => /* glsl */ `
{
  vec3 wireN = normalize( vWireObj );
  float wireLatC = ( asin( clamp( wireN.y, -1.0, 1.0 ) ) / PI + 0.5 ) * uWireLat;
  float wireLonC = ( atan( wireN.z, wireN.x ) / ( 2.0 * PI ) + 0.5 ) * uWireLon;
  // Meridians crowd together at the poles — fade them out before they
  // collapse into a solid cap
  float wirePole = 1.0 - smoothstep( 0.86, 0.995, abs( wireN.y ) );
  float wireLine = max(
    wireGridLine( wireLatC ),
    wireGridLine( wireLonC ) * wirePole
  );
  float wireFacing = abs( dot( normalize( vWireNormal ), normalize( -vWireView ) ) );
  float wireGain = uWireGain;
  ${
    hover
      ? // The hover brighten every clickable body already eases on
        // `emissiveIntensity` would be mixed away with the lit color, so
        // fold it into the wires instead — hovering flushes the lattice
        `wireGain *= 1.0 + 1.8 * clamp( length( totalEmissiveRadiance ), 0.0, 1.0 );`
      : ``
  }
  vec3 wireLit =
    uWireColor * uWireTint *
    ( wireLine * wireGain + pow( 1.0 - wireFacing, 3.0 ) * uWireRim );
  outgoingLight = mix( outgoingLight, wireLit, uWire );
  // Alpha is left alone on purpose. Under additive blending it scales
  // what the body contributes, and it is also the ONLY thing hiding the
  // bodies that fade rather than unmount — the moon off /about, the
  // planets before the landing reveal, the whole synth system on
  // arrival. Forcing it to 1 here lit all of them up in mesh view.
}
`;

interface SkinnedState {
  blending: THREE.Blending;
  depthWrite: boolean;
  side: THREE.Side;
  transparent: boolean;
}

/** Restore-on-the-way-back values, captured before mesh view first
 *  touches a material. */
const original = new WeakMap<THREE.Material, SkinnedState>();

function setMeshProps(material: THREE.Material, on: boolean): void {
  let base = original.get(material);
  if (!base) {
    base = {
      blending: material.blending,
      depthWrite: material.depthWrite,
      side: material.side,
      transparent: material.transparent,
    };
    original.set(material, base);
  }
  if (on) {
    material.blending = THREE.AdditiveBlending;
    material.depthWrite = false;
    // See through to the far side's wires
    material.side = THREE.DoubleSide;
    material.transparent = true;
  } else {
    material.blending = base.blending;
    material.depthWrite = base.depthWrite;
    material.side = base.side;
    material.transparent = base.transparent;
  }
}

/**
 * Give a material the wire skin. Call before its first render — and
 * before `applyShimmer`, though the hook registry keeps them in the right
 * order either way.
 *
 * The material is tagged in `userData` so the driver can find it again
 * on a flip; a body that mounts while mesh view is already on gets the
 * blend state immediately, so it never appears solid for a frame.
 */
export function applyWireSkin(
  material: THREE.Material,
  {
    lon = 24,
    lat = 16,
    gain = 0.95,
    hover = false,
    tint = "#ffffff",
  }: WireSkinOptions = {},
): void {
  registerMaterialHook(material, {
    // The hover term is the only thing that varies the generated GLSL
    key: `wire:${hover ? "hover" : "plain"}`,
    order: "replace",
    uniforms: {
      uWire: wireUniforms.uWire,
      uWireColor: wireUniforms.uWireColor,
      uWireRim: wireUniforms.uWireRim,
      uWireLat: { value: lat },
      uWireLon: { value: lon },
      uWireGain: { value: gain },
      uWireTint: { value: new THREE.Color(tint) },
    },
    vertexHeader: VERTEX_HEADER,
    vertexBody: VERTEX_BODY,
    fragmentHeader: FRAGMENT_HEADER,
    fragmentBody: fragmentBody(hover),
  });
  material.userData.wireSkin = true;
  setMeshProps(material, wireState.target > 0);
}

/** Flip every skinned material in a scene between the two views. Runs on
 *  a mode change only — never per frame. */
export function setSceneWireMode(scene: THREE.Object3D, on: boolean): void {
  scene.traverse((object) => {
    const material = (object as THREE.Mesh).material;
    if (!material) return;
    for (const m of Array.isArray(material) ? material : [material]) {
      if (m.userData?.wireSkin) setMeshProps(m, on);
    }
  });
}
