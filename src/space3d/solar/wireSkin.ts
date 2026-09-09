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

export interface WireMirrorLight {
  /** Where the light sits: a view-space offset (+x right, +y up, +z
   *  toward the viewer) from the object's origin, in the geometry's own
   *  units — so a light "just below the coin" is written in coin radii
   *  and rides the coin wherever it's anchored. A point light, not a
   *  direction: that's what gathers its glints on the facets nearest it. */
  position: THREE.Vector3;
  color: THREE.ColorRepresentation;
}

export interface WireMirrorOptions {
  /** Exactly two spots */
  lights: [WireMirrorLight, WireMirrorLight];
  /** How far a cell's normal may wander — what breaks a glint into a
   *  mosaic instead of a smooth highlight */
  tilt?: number;
  /** Brightness of the mirrored cells */
  gain?: number;
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
  /** Light the wires from the sun (the world origin): the side facing it
   *  runs at full brightness and the far side drops to WIRE_NIGHT, with
   *  a soft terminator between — mesh view's take on the day/night the
   *  space view gets from its point light. Planets and the moon only;
   *  hardware that isn't in orbit (the satellite's parts, the synth,
   *  the corner coin) has no business being sunlit. */
  sunlit?: boolean;
  /** Meridians around the body ("sphere") */
  lon?: number;
  /** Parallels from pole to pole ("sphere") */
  lat?: number;
  /** Peak brightness of a wire */
  gain?: number;
  /** Turn the cells between the wires into flat mirrors: each cell gets
   *  its own slightly-off normal and reflects a neutral room plus two
   *  spots (the disco sun's trick, sunShaders.ts) — for hardware that
   *  should read as polished metal. Light directions are VIEW space; in
   *  the fixed-camera star canvas that is screen space. */
  mirror?: WireMirrorOptions;
  /** Keep the material solid in mesh view — normal blending, depth
   *  written, its own side setting — instead of the additive see-through
   *  the bodies take. For hardware that should read as an object rather
   *  than a cage: the mirror coin, whose stacked faces and rims blow out
   *  to white under additive blending. */
  solid?: boolean;
  /** Let this share (0..1) of the material's own lit colour through
   *  under the wires — the parchment's cream, the 808's pad colours — so
   *  a part reads as a translucent version of its space-view self rather
   *  than bare lines. 0 (the default) is pure wires. */
  keep?: number;
  /** An even glow between the wires, in the body's tint, as a share of
   *  full wire brightness — what makes a body read as a lit surface
   *  rather than an empty cage. Earth gets this for free from its dense
   *  grid hazing at screen size; the coarser bodies take it explicitly. */
  fill?: number;
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

const fragmentHeader = (twoTone: boolean, mirror: boolean) => /* glsl */ `
varying vec3 vWireObj;
varying vec3 vWireNormal;
varying vec3 vWireView;
varying vec3 vWireOriginView;
varying float vWireScale;
uniform float uWire;
uniform vec3 uWireColor;
uniform float uWireRim;
uniform float uWireLat;
uniform float uWireLon;
uniform float uWirePitch;
uniform float uWireGain;
uniform float uWireFill;
uniform float uWireKeep;
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
// A cheap hash: the two-tone blobs' noise and the mirror cells' wobble
float wireHash( vec3 p ) {
  return fract( sin( dot( p, vec3( 127.1, 311.7, 74.7 ) ) ) * 43758.5453 );
}
${
  mirror
    ? /* glsl */ `
uniform vec3 uMirrorLight0;
uniform vec3 uMirrorLight1;
uniform vec3 uMirrorColor0;
uniform vec3 uMirrorColor1;
uniform float uMirrorTilt;
uniform float uMirrorGain;
`
    : ``
}
${
  twoTone
    ? /* glsl */ `
uniform vec3 uWireTintAlt;
uniform float uWireAltCut;

// Value noise on the object-space direction — cheap, no texture, and
// stable per fragment, which is all the blobs need
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
varying vec3 vWireOriginView;
varying float vWireScale;
`;

// The origin and uniform scale are for the mirror's point lights, which
// are placed relative to the object in its own units; constant over the
// mesh, so interpolation leaves them alone
const VERTEX_BODY = /* glsl */ `
vWireObj = transformed;
vWireNormal = normalize( normalMatrix * normal );
vWireView = ( modelViewMatrix * vec4( transformed, 1.0 ) ).xyz;
vWireOriginView = ( modelViewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
vWireScale = length( modelViewMatrix[0].xyz );
`;

/** The far side's share of the wire brightness under `sunlit` — dark
 *  enough to read as night at a glance, light enough that the lattice
 *  still shows through (the space view's shadow side is near-black). */
const WIRE_NIGHT = 0.22;

const fragmentBody = (
  hover: boolean,
  twoTone: boolean,
  box: boolean,
  sunlit: boolean,
  mirror: boolean,
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
  );
  vec3 wireFacetId = floor( wireCell );`
      : /* glsl */ `
  float wireLatC = ( asin( clamp( wireN.y, -1.0, 1.0 ) ) / PI + 0.5 ) * uWireLat;
  float wireLonC = ( atan( wireN.z, wireN.x ) / ( 2.0 * PI ) + 0.5 ) * uWireLon;
  // Meridians crowd together at the poles — fade them out before they
  // collapse into a solid cap
  float wirePole = 1.0 - smoothstep( 0.86, 0.995, abs( wireN.y ) );
  float wireLine = max(
    wireGridLine( wireLatC ),
    wireGridLine( wireLonC ) * wirePole
  );
  vec3 wireFacetId = vec3( floor( wireLatC ), floor( wireLonC ), 0.0 );`
  }
  float wireFacing = abs( dot( normalize( vWireNormal ), normalize( -vWireView ) ) );
  float wireGain = uWireGain;
  float wireDay = 1.0;
  ${
    sunlit
      ? /* glsl */ `
  // Day side toward the sun at the world origin, in view space (the
  // normal here is view-space too). A wide terminator, so the fall-off
  // wraps a little past the limb instead of cutting the globe in half.
  vec3 wireSunView = ( viewMatrix * vec4( 0.0, 0.0, 0.0, 1.0 ) ).xyz;
  float wireSunFacing =
    dot( normalize( vWireNormal ), normalize( wireSunView - vWireView ) );
  wireDay = mix( ${WIRE_NIGHT.toFixed(2)}, 1.0, smoothstep( -0.25, 0.45, wireSunFacing ) );`
      : ``
  }
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
  vec3 wireMirror = vec3( 0.0 );
  ${
    mirror
      ? /* glsl */ `
  {
    // Every lattice cell is a flat mirror with its own slightly-off
    // normal (the disco sun's trick): it reflects a neutral room plus
    // the two spots, and the wobble scatters their glints into a mosaic.
    // The wires themselves stay on top — the mirror fills between them.
    vec3 facetWobble = vec3(
      wireHash( wireFacetId + vec3( 1.7, 0.0, 0.0 ) ),
      wireHash( wireFacetId + vec3( 0.0, 5.3, 0.0 ) ),
      wireHash( wireFacetId + vec3( 0.0, 0.0, 9.1 ) )
    ) - 0.5;
    vec3 facetN = normalize( normalize( vWireNormal ) + facetWobble * uMirrorTilt );
    vec3 facetEye = normalize( -vWireView );
    vec3 facetR = reflect( -facetEye, facetN );
    vec3 facetEnv = mix( vec3( 0.10, 0.10, 0.13 ), vec3( 0.58, 0.58, 0.64 ), facetR.y * 0.5 + 0.5 );
    // The spots are points near the object: the direction to each one
    // changes across the surface, so the facets nearest a spot are the
    // ones that can face it halfway, and its glints gather there
    vec3 facetToLight0 = normalize( vWireOriginView + uMirrorLight0 * vWireScale - vWireView );
    vec3 facetToLight1 = normalize( vWireOriginView + uMirrorLight1 * vWireScale - vWireView );
    facetEnv += uMirrorColor0 * smoothstep( 0.86, 0.985, dot( facetR, facetToLight0 ) );
    facetEnv += uMirrorColor1 * smoothstep( 0.86, 0.985, dot( facetR, facetToLight1 ) );
    wireMirror =
      uWireColor * wireBodyTint * facetEnv * uMirrorGain
      * ( 0.3 + 0.7 * max( dot( facetN, facetEye ), 0.0 ) )
      * ( 1.0 - wireLine ) * wireDay;
  }`
      : ``
  }
  // The rim keeps half its light on the night side so the silhouette
  // never disappears against the sky
  vec3 wireLit =
    uWireColor * wireBodyTint *
    ( ( wireLine * wireGain + uWireFill ) * wireDay
      + pow( 1.0 - wireFacing, 3.0 ) * uWireRim * ( 0.5 + 0.5 * wireDay ) )
    + wireMirror
    // A share of the part's own shading, so it keeps its colour
    + outgoingLight * uWireKeep;
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
  // Solid hardware keeps its own blend state in both views
  if (material.userData.wireSolid) return;
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
    sunlit = false,
    lon = 24,
    lat = 16,
    gain = 0.95,
    fill = 0,
    keep = 0,
    mirror,
    solid = false,
    hover = false,
    tint = "#ffffff",
    tintAlt,
    tintAltCoverage = 1 / 3,
  }: WireSkinOptions = {},
): void {
  const twoTone = tintAlt !== undefined;
  const box = grid === "box";
  const mirrored = mirror !== undefined;
  registerMaterialHook(material, {
    // All three terms change the generated GLSL, so all three have to
    // name themselves here — three caches programs on this string
    key: `wire:${hover ? "hover" : "plain"}:${twoTone ? "blob" : "flat"}:${grid}:${sunlit ? "sunlit" : "flat-lit"}:${mirrored ? "mirror" : "matte"}`,
    order: "replace",
    uniforms: {
      uWire: wireUniforms.uWire,
      uWireColor: wireUniforms.uWireColor,
      uWireRim: wireUniforms.uWireRim,
      uWireLat: { value: lat },
      uWireLon: { value: lon },
      uWirePitch: { value: pitch },
      uWireGain: { value: gain },
      uWireFill: { value: fill },
      uWireKeep: { value: keep },
      ...(mirror
        ? {
            uMirrorLight0: { value: mirror.lights[0].position.clone() },
            uMirrorLight1: { value: mirror.lights[1].position.clone() },
            uMirrorColor0: { value: new THREE.Color(mirror.lights[0].color) },
            uMirrorColor1: { value: new THREE.Color(mirror.lights[1].color) },
            uMirrorTilt: { value: mirror.tilt ?? 0.16 },
            uMirrorGain: { value: mirror.gain ?? 1 },
          }
        : {}),
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
    fragmentHeader: fragmentHeader(twoTone, mirrored),
    fragmentBody: fragmentBody(hover, twoTone, box, sunlit, mirrored),
  });
  material.userData.wireSkin = true;
  material.userData.wireSolid = solid;
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
