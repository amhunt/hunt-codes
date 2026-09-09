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
 *  eases this across WIRE_FADE_MS; every skinned material reads the same
 *  uniform object, so one write per frame moves the whole scene. */
export const wireState = {
  amount: 0,
  target: 0,
  /** Where the running fade started from, and when (performance.now) */
  from: 0,
  changedAt: 0,
};

const WIRE_FADE_MS = 700;

/** The blue-white every body's wires start from, and that every `tint`
 *  multiplies. */
const WIRE_BASE = new THREE.Color("#bfe6ff");

export const wireUniforms = {
  uWire: { value: 0 },
  uWireColor: { value: WIRE_BASE.clone() },
  /** Brightness of the rim light at the limb */
  uWireRim: { value: 0.55 },
};

/** Point the crossfade at a view. A no-op when already headed there, so
 *  every driver can call it on its own mode change. */
export function setWireTarget(target: 0 | 1): void {
  if (wireState.target === target) return;
  wireState.from = wireState.amount;
  wireState.target = target;
  wireState.changedAt = performance.now();
}

/**
 * Advance the crossfade to `now`. Driven off the clock rather than a
 * per-frame delta so it doesn't matter how many canvases call it in a
 * frame: the solar scene and the star canvas (the corner coin) each run
 * a WireDriver, and both land on the same value. Ease-out cubic, so the
 * switch reads as a quick commit that settles.
 */
export function stepWireFade(now: number): void {
  if (wireState.amount === wireState.target) return;
  const t = Math.min(1, (now - wireState.changedAt) / WIRE_FADE_MS);
  wireState.amount =
    t >= 1
      ? wireState.target
      : wireState.from +
        (wireState.target - wireState.from) * (1 - (1 - t) ** 3);
  wireUniforms.uWire.value = wireState.amount;
}

/**
 * The `tint` that lands a body's wires ON `target` rather than somewhere
 * underneath it: tints multiply the shared blue-white, so a body that
 * wants a specific colour divides by it first. Components above 1 fall
 * out of that naturally (red needs ~1.34 to survive a base with only
 * 0.75 red in it) and are exactly what makes the neon bodies read as
 * neon — the shader has headroom above white.
 */
export function wireTint(target: THREE.ColorRepresentation): THREE.Color {
  const c = new THREE.Color(target);
  return new THREE.Color(
    c.r / WIRE_BASE.r,
    c.g / WIRE_BASE.g,
    c.b / WIRE_BASE.b,
  );
}

interface WireSkinOptions {
  /** How the lattice is laid out. "sphere" (the default) is lat/long
   *  lines from the object-space direction — right for globes and
   *  round-ish bodies. On a flat or boxy part those lines all converge on
   *  the part's centre and read as a web; "box" draws a cartesian lattice
   *  instead, lines wherever object-space x, y or z crosses a multiple of
   *  `pitch`, so a sheet gets a grid and a cylinder gets rings. */
  grid?: "sphere" | "box";
  /** "box" only: cell size, in the geometry's own units */
  pitch?: number;
  /** Meridians around the body ("sphere") */
  lon?: number;
  /** Parallels from pole to pole ("sphere") */
  lat?: number;
  /** Peak brightness of a wire */
  gain?: number;
  /** Pulls this body's wires off the shared blue-white toward a color of
   *  its own. The satellite's four part-links are told apart at that
   *  scale by hue as much as by shape, so they keep a trace of it —
   *  multiplied, not replaced, so everything still reads as one palette.
   *  Pass `wireTint("#rrggbb")` to name the final colour instead. */
  tint?: THREE.ColorRepresentation;
  /** A second tint, painted over blobby patches of the body — Earth's
   *  abstract land against its sea. Both tints ride object space, so the
   *  patches spin with the globe instead of swimming across it. */
  tintAlt?: THREE.ColorRepresentation;
  /** Roughly the share of the surface `tintAlt` takes, 0..1. Rough on
   *  purpose: it's a threshold on a noise field, not a measured area. */
  tintAltCoverage?: number;
  /** Fold the material's emissive (the hover brighten every clickable
   *  body already animates) into the wire brightness. MeshStandard only —
   *  `totalEmissiveRadiance` doesn't exist in the basic material's
   *  program, so leaving this on for one would fail to link. */
  hover?: boolean;
}

const fragmentHeader = (twoTone: boolean) => /* glsl */ `
varying vec3 vWireObj;
varying vec3 vWireNormal;
varying vec3 vWireView;
uniform float uWire;
uniform vec3 uWireColor;
uniform float uWireRim;
uniform float uWireLat;
uniform float uWireLon;
uniform float uWirePitch;
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
${
  twoTone
    ? /* glsl */ `
uniform vec3 uWireTintAlt;
uniform float uWireAltCut;

// Value noise on the object-space direction — cheap, no texture, and
// stable per fragment, which is all the blobs need
float wireHash( vec3 p ) {
  return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 );
}

float wireNoise( vec3 p ) {
  vec3 i = floor( p );
  vec3 f = fract( p );
  f = f * f * ( 3.0 - 2.0 * f );
  return mix(
    mix(
      mix( wireHash( i + vec3( 0.0, 0.0, 0.0 ) ), wireHash( i + vec3( 1.0, 0.0, 0.0 ) ), f.x ),
      mix( wireHash( i + vec3( 0.0, 1.0, 0.0 ) ), wireHash( i + vec3( 1.0, 1.0, 0.0 ) ), f.x ),
      f.y
    ),
    mix(
      mix( wireHash( i + vec3( 0.0, 0.0, 1.0 ) ), wireHash( i + vec3( 1.0, 0.0, 1.0 ) ), f.x ),
      mix( wireHash( i + vec3( 0.0, 1.0, 1.0 ) ), wireHash( i + vec3( 1.0, 1.0, 1.0 ) ), f.x ),
      f.y
    ),
    f.z
  );
}
`
    : ``
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

const fragmentBody = (
  hover: boolean,
  twoTone: boolean,
  box: boolean,
) => /* glsl */ `
{
  vec3 wireN = normalize( vWireObj );
  ${
    box
      ? /* glsl */ `
  // Cartesian lattice: a line wherever x, y or z crosses a cell boundary.
  // Offset half a cell so a boundary never sits on the geometry's own
  // centre planes (where a whole face would light up). A face's normal
  // axis is constant across it, so its derivative is zero and that term
  // drops out by itself.
  vec3 wireCell = vWireObj / uWirePitch + 0.5;
  float wireLine = max(
    max( wireGridLine( wireCell.x ), wireGridLine( wireCell.y ) ),
    wireGridLine( wireCell.z )
  );`
      : /* glsl */ `
  float wireLatC = ( asin( clamp( wireN.y, -1.0, 1.0 ) ) / PI + 0.5 ) * uWireLat;
  float wireLonC = ( atan( wireN.z, wireN.x ) / ( 2.0 * PI ) + 0.5 ) * uWireLon;
  // Meridians crowd together at the poles — fade them out before they
  // collapse into a solid cap
  float wirePole = 1.0 - smoothstep( 0.86, 0.995, abs( wireN.y ) );
  float wireLine = max(
    wireGridLine( wireLatC ),
    wireGridLine( wireLonC ) * wirePole
  );`
  }
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
  vec3 wireBodyTint = uWireTint;
  ${
    twoTone
      ? /* glsl */ `
  // Two octaves is enough for continent-sized patches with a ragged edge.
  // The cut is a plain threshold, so coverage is approximate by design.
  float wireBlob =
    wireNoise( wireN * 2.6 ) * 0.65 + wireNoise( wireN * 5.9 ) * 0.35;
  wireBodyTint = mix(
    uWireTint,
    uWireTintAlt,
    smoothstep( uWireAltCut - 0.05, uWireAltCut + 0.05, wireBlob )
  );`
      : ``
  }
  vec3 wireLit =
    uWireColor * wireBodyTint *
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
    grid = "sphere",
    pitch = 1,
    lon = 24,
    lat = 16,
    gain = 0.95,
    hover = false,
    tint = "#ffffff",
    tintAlt,
    tintAltCoverage = 1 / 3,
  }: WireSkinOptions = {},
): void {
  const twoTone = tintAlt !== undefined;
  const box = grid === "box";
  registerMaterialHook(material, {
    // All three terms change the generated GLSL, so all three have to
    // name themselves here — three caches programs on this string
    key: `wire:${hover ? "hover" : "plain"}:${twoTone ? "blob" : "flat"}:${grid}`,
    order: "replace",
    uniforms: {
      uWire: wireUniforms.uWire,
      uWireColor: wireUniforms.uWireColor,
      uWireRim: wireUniforms.uWireRim,
      uWireLat: { value: lat },
      uWireLon: { value: lon },
      uWirePitch: { value: pitch },
      uWireGain: { value: gain },
      uWireTint: { value: new THREE.Color(tint) },
      ...(twoTone
        ? {
            uWireTintAlt: { value: new THREE.Color(tintAlt) },
            // The field is nowhere near uniform over 0..1 — two octaves
            // of value noise pile up around 0.5 (measured range ≈
            // 0.11..0.89 over the sphere), so the obvious `1 - coverage`
            // cut misses badly: 2/3 paints 13% of the globe, not 33%.
            // This is a linear fit to the measured quantiles, within
            // about a point across the range worth asking for.
            uWireAltCut: { value: 0.5 + (0.5 - tintAltCoverage) * 0.385 },
          }
        : {}),
    },
    vertexHeader: VERTEX_HEADER,
    vertexBody: VERTEX_BODY,
    fragmentHeader: fragmentHeader(twoTone),
    fragmentBody: fragmentBody(hover, twoTone, box),
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
