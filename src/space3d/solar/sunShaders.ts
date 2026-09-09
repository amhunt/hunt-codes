import * as THREE from "three";

/**
 * GLSL for the sun's two shader materials:
 *
 * - Surface: domain-warped fbm noise over the sphere, animated in time so
 *   the convection cells and dark spots drift, grow and dissolve (the old
 *   static canvas texture couldn't evolve). Limb darkening keeps the
 *   close-up home view reading as a photosphere rather than a flat disc.
 *   Mesh view crossfades the same material to a gold mirror ball (see the
 *   `uMesh` branch) — procedural tiles and a procedural room to reflect,
 *   since the scene has no environment map.
 * - Corona: a 3D shell enveloping the sun whose rim glow hugs the limb
 *   with angular waves plus traveling "burst" lobes — solar flares going
 *   off at different spots. The limb is derived per fragment from the
 *   view geometry itself (see the impact-parameter note below), so the
 *   glow can't misalign with the sphere; the nominal band width is fed
 *   in per frame to track a fixed ~24 CSS px.
 *
 * Fragment cost scales with the sun's on-screen pixel coverage, so the
 * landing view (small sun) and about view (sun mostly off-frame) pay
 * almost nothing — the detail is effectively home-page-only for free.
 */

/** Compact 3D value noise + fbm (hash13 after Dave Hoskins' hash without
 *  sine, stable across GPUs). */
const NOISE_GLSL = /* glsl */ `
  float hash13(vec3 p3) {
    p3 = fract(p3 * 0.1031);
    p3 += dot(p3, p3.zyx + 31.32);
    return fract((p3.x + p3.y) * p3.z);
  }

  float noise3(vec3 p) {
    vec3 i = floor(p);
    vec3 f = fract(p);
    vec3 u = f * f * (3.0 - 2.0 * f);
    float n000 = hash13(i);
    float n100 = hash13(i + vec3(1.0, 0.0, 0.0));
    float n010 = hash13(i + vec3(0.0, 1.0, 0.0));
    float n110 = hash13(i + vec3(1.0, 1.0, 0.0));
    float n001 = hash13(i + vec3(0.0, 0.0, 1.0));
    float n101 = hash13(i + vec3(1.0, 0.0, 1.0));
    float n011 = hash13(i + vec3(0.0, 1.0, 1.0));
    float n111 = hash13(i + vec3(1.0, 1.0, 1.0));
    return mix(
      mix(mix(n000, n100, u.x), mix(n010, n110, u.x), u.y),
      mix(mix(n001, n101, u.x), mix(n011, n111, u.x), u.y),
      u.z
    );
  }

  float fbm(vec3 p) {
    float value = 0.0;
    float amplitude = 0.5;
    for (int i = 0; i < 5; i++) {
      value += amplitude * noise3(p);
      p = p * 2.03 + 19.19;
      amplitude *= 0.5;
    }
    return value;
  }
`;

const SURFACE_VERTEX = /* glsl */ `
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying vec3 vCenterView;
  varying vec3 vMVx;
  varying vec3 vMVy;
  varying vec3 vMVz;

  void main() {
    vObjPos = position;
    vViewNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPosition.xyz;
    // The sun's centre and its object->view basis, for the mirror-ball
    // branch, which rebuilds each tile's centre and normal in view space
    // per fragment. Constant over the mesh, so interpolation leaves them
    // alone — and the fragment stage has no modelViewMatrix of its own.
    vCenterView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    vMVx = modelViewMatrix[0].xyz;
    vMVy = modelViewMatrix[1].xyz;
    vMVz = modelViewMatrix[2].xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Palette matches the old canvas texture (#ffb824 base, #ff6a00 embers,
// #fff3c4 highlights) plus a deep umbral tone for the dark spots.
// A raw ShaderMaterial gets none of three's built-in chunks, so the sun
// brings its own PI and its own screen-constant line function — the one
// the wire cages use (wireSkin.ts gets it via <common>), here drawing the
// dark grout between the mirror ball's tiles.
const SUN_WIRE_GLSL = /* glsl */ `
  #define SUN_PI 3.141592653589793

  float sunWire(float coord) {
    float w = min(fwidth(coord), 0.35);
    float d = abs(fract(coord - 0.5) - 0.5) / max(w, 1e-4);
    return 1.0 - smoothstep(0.0, 1.4, d);
  }
`;

// The mirror ball's knobs. Rows of tiles pole to pole (the equator gets
// twice as many around); how far a tile's normal may wander, radians;
// the spin, radians per second (a real one turns a couple of rpm); the
// spots — a few lights aimed at the ball from fixed spots in WORLD
// space (the direction each shines from, unit length, and its colour),
// with a beam the tiles' reflections have to land inside; and the
// palette — gold for the mirrors, a warm room for them to reflect, spot
// brightness well over 1 so the glints bloom. Written raw to an sRGB
// target like the rest of this file, so they're tuned by eye, not by
// physics.
const DISCO_GLSL = /* glsl */ `
  #define DISCO_ROWS 26.0
  #define DISCO_TILT 0.2
  #define DISCO_SPIN 0.3
  // All four sit 10deg above the orbital plane (y = sin 10deg), spread
  // around the ball at uneven azimuths, so from the top-down landing
  // camera the beams come in from the sides, by the planets' orbits,
  // and each highlight lands about two thirds of the way out to the limb
  #define DISCO_LIGHT_COUNT 4
  const vec3 DISCO_LIGHT_DIR[DISCO_LIGHT_COUNT] = vec3[DISCO_LIGHT_COUNT](
    vec3(0.925, 0.174, 0.337),    // azimuth 20deg
    vec3(-0.416, 0.174, 0.892),   // 115deg
    vec3(-0.892, 0.174, -0.416),  // 205deg
    vec3(0.492, 0.174, -0.853)    // 300deg
  );
  const vec3 DISCO_LIGHT_COL[DISCO_LIGHT_COUNT] = vec3[DISCO_LIGHT_COUNT](
    vec3(1.0, 0.98, 0.9),
    vec3(1.0, 0.88, 0.66),
    vec3(0.85, 0.95, 1.0),
    vec3(1.0, 0.94, 0.8)
  );
  // cos 24deg: a reflection this far off a spot is dark; cos 8deg: dead
  // on, full brightness. Between them is where the tile wobble makes a
  // highlight patchy.
  #define DISCO_BEAM_EDGE 0.91
  #define DISCO_BEAM_CORE 0.99
  // Hovered (uHover -> 1): the spots run twice as bright and their beams
  // open from 24deg to ~37deg (cos 0.80), so more tiles light up
  #define DISCO_HOVER_BEAM_EDGE 0.80
  #define DISCO_HOVER_GAIN 2.0
  #define DISCO_GOLD vec3(1.0, 0.82, 0.28)
  #define DISCO_ROOM_LIGHT vec3(1.25, 1.15, 0.9)
  #define DISCO_ROOM_DARK vec3(0.32, 0.24, 0.1)
  #define DISCO_SPOT vec3(2.4, 2.2, 1.8)
  #define DISCO_GROUT vec3(0.12, 0.09, 0.02)
`;

/**
 * Which look the sun takes in mesh view. Both are compiled into the one
 * program and picked by the `uMeshStyle` uniform, so flipping this — or,
 * some day, writing the uniform at runtime for an easter egg — costs
 * nothing. "wire" is the neon cage the mirror ball replaced.
 */
const MESH_SUN_STYLE: "disco" | "wire" = "disco";

const MESH_STYLES_GLSL = /* glsl */ `
  // Mesh view: the photosphere gives way to a gold mirror ball. The
  // sphere is tiled the way a real one is glued — rows of square
  // mirrors, fewer per row toward the poles — and every tile is a flat
  // mirror with its own slightly-off normal, reflecting a procedural
  // "room": a warm gradient, plus a few spots fixed in world space, so
  // the glints hold still while the ball turns under them and hand off
  // tile to tile the way a real one twinkles. One reflection per
  // TILE, not per fragment: the tile's centre stands in for the
  // fragment, so each mirror is one flat colour and the ball reads as
  // a mosaic rather than a smooth chrome sphere. The sun stays solid
  // (depth written, alpha 1): its depth buffer culls the far half of
  // the corona shell.
  vec3 sunMeshDisco(vec3 p, float ndv) {
    // Spin the tiling in-shader, at disco pace: the mesh's own spin is
    // glacial (the space-view fbm rides it) and stays that way
    float spin = uTime * DISCO_SPIN;
    float cs = cos(spin);
    float sn = sin(spin);
    vec3 d = vec3(p.x * cs - p.z * sn, p.y, p.x * sn + p.z * cs);

    float lat = asin(clamp(d.y, -1.0, 1.0));
    float rowF = (lat / SUN_PI + 0.5) * DISCO_ROWS;
    float row = min(floor(rowF), DISCO_ROWS - 1.0);
    float rowLat = ((row + 0.5) / DISCO_ROWS - 0.5) * SUN_PI;
    // Square-ish tiles: a row's circumference shrinks with cos(lat),
    // so its tile count does too, down to a three-tile cap at the poles
    float cols = max(3.0, floor(2.0 * DISCO_ROWS * cos(rowLat)));
    float lon = atan(d.z, d.x);
    float colF = (lon / (2.0 * SUN_PI) + 0.5) * cols;
    float col_ = mod(floor(colF), cols);
    float colLon = ((col_ + 0.5) / cols - 0.5) * 2.0 * SUN_PI;

    // Tile centre and normal in the spun frame — the normal knocked a
    // few degrees off by a per-tile hash, the way hand-glued mirrors
    // never quite line up (it's what scatters the glints into a mosaic
    // instead of smooth bands) — then back into object space
    vec3 tileDir = vec3(
      cos(rowLat) * cos(colLon),
      sin(rowLat),
      cos(rowLat) * sin(colLon)
    );
    vec3 id = vec3(col_, row, 0.0);
    vec3 wobble = vec3(
      hash13(id + vec3(0.0, 0.0, 1.7)),
      hash13(id + vec3(0.0, 0.0, 5.3)),
      hash13(id + vec3(0.0, 0.0, 9.1))
    ) - 0.5;
    vec3 tileN = normalize(tileDir + wobble * DISCO_TILT);
    vec3 tileDirObj = vec3(
      tileDir.x * cs + tileDir.z * sn,
      tileDir.y,
      -tileDir.x * sn + tileDir.z * cs
    );
    vec3 tileNObj = vec3(
      tileN.x * cs + tileN.z * sn,
      tileN.y,
      -tileN.x * sn + tileN.z * cs
    );
    // Into view space. The sun scales uniformly, so the modelView basis
    // carries normals as well as positions.
    vec3 tileView = vCenterView + length(vObjPos) * (
      tileDirObj.x * vMVx + tileDirObj.y * vMVy + tileDirObj.z * vMVz
    );
    vec3 nV = normalize(tileNObj.x * vMVx + tileNObj.y * vMVy + tileNObj.z * vMVz);
    vec3 toCam = normalize(-tileView);
    vec3 R = reflect(-toCam, nV);
    float tileFacing = max(dot(nV, toCam), 0.0);

    // The room in the mirrors: warm from above, dim below...
    vec3 env = mix(DISCO_ROOM_DARK, DISCO_ROOM_LIGHT, R.y * 0.5 + 0.5);
    // ...and the spots, the way a mirror ball actually works: each is
    // fixed in world space (it stays put while the ball turns and while
    // the camera moves between views), and a tile lights up only while
    // its reflection of the camera lands inside that spot's beam. The
    // per-tile wobble breaks each highlight into a patchy cluster and
    // the spin marches tiles through it — that's the twinkle, with no
    // randomness on top.
    // Hover (the ENTER link, or the sun itself) turns the spots up and
    // opens their beams — the whole ball catches more light
    float beamEdge = mix(DISCO_BEAM_EDGE, DISCO_HOVER_BEAM_EDGE, uHover);
    float spotGain = mix(1.0, DISCO_HOVER_GAIN, uHover);
    mat3 viewRot = mat3(viewMatrix);
    for (int i = 0; i < DISCO_LIGHT_COUNT; i++) {
      vec3 L = normalize(viewRot * DISCO_LIGHT_DIR[i]);
      env += DISCO_LIGHT_COL[i] * DISCO_SPOT * spotGain
        * smoothstep(beamEdge, DISCO_BEAM_CORE, dot(R, L));
    }

    // Gold mirror: the reflection, tinted. Tiles turned away from the
    // camera go dim — their bit of room is the darker one anyway.
    vec3 tile = DISCO_GOLD * env * (0.3 + 0.7 * tileFacing);
    // Dark grout between the mirrors — the wire cages' screen-constant
    // line, run dark instead of bright. It thins out as the tiles
    // shrink past a few pixels (a phone-sized landing sun), where a
    // line every other pixel would just paint the ball grey.
    float grout = max(sunWire(rowF), sunWire(colF));
    float tilePx = 1.0 / max(fwidth(rowF), 1e-4);
    vec3 meshCol = mix(tile, DISCO_GROUT, grout * 0.7 * smoothstep(3.0, 7.0, tilePx));
    // A faint rim so the disc holds its edge against the dark sky
    meshCol += DISCO_GOLD * pow(1.0 - ndv, 3.0) * 0.35;
    return meshCol;
  }
  // The mesh-view sun before the mirror ball, kept as a second style:
  // the star keeps churning, but the fbm stops being a photosphere and
  // becomes brightness variation read *through* a wire cage — the
  // convection cells survive as the scan's contour data. v is the
  // photosphere's fbm field.
  vec3 sunMeshWire(vec3 p, float ndv, float v) {
    float latC = (asin(clamp(p.y, -1.0, 1.0)) / SUN_PI + 0.5) * 26.0;
    float lonC = (atan(p.z, p.x) / (2.0 * SUN_PI) + 0.5) * 34.0;
    float pole = 1.0 - smoothstep(0.86, 0.995, abs(p.y));
    float wire = max(sunWire(latC), sunWire(lonC) * pole);
    // The star is the one body that reads as a light source in this
    // view, so its wires run hot: MESH_HOT sits above 1 on purpose,
    // which is what makes the cage bloom rather than sit flat like the
    // planets'.
    vec3 MESH_DEEP = vec3(0.125, 0.098, 0.008);  // a dim ember, not black
    vec3 MESH_HOT  = vec3(1.35, 1.18, 0.16);     // neon yellow, overdriven
    return
      MESH_DEEP
      + MESH_HOT * wire * (0.7 + 0.9 * smoothstep(0.25, 0.82, v))
      + MESH_HOT * pow(1.0 - ndv, 3.0) * 0.75;
  }
`;

const SURFACE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  uniform float uMesh;
  uniform float uMeshStyle;
  uniform float uHover;
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;
  varying vec3 vCenterView;
  varying vec3 vMVx;
  varying vec3 vMVy;
  varying vec3 vMVz;

  ${""}
  __NOISE__
  __SUNWIRE__
  __DISCO__
  __MESH_STYLES__

  void main() {
    vec3 p = normalize(vObjPos);
    float t = uTime * 0.05;

    // Domain-warped fbm, drifting in time: cells merge, split and churn.
    // Sampling in object space means the pattern also rides the mesh spin.
    vec3 q = p * 2.2;
    float warp = fbm(q + vec3(t, -t * 0.6, t * 0.3));
    float field = fbm(q * 1.9 + vec3(warp * 1.7) + vec3(0.0, t * 0.8, -t * 0.5));
    // Fine granulation "boil", faster than the large cells
    float gran = noise3(p * 16.0 + vec3(0.0, 0.0, uTime * 0.32));
    float v = field + (gran - 0.5) * 0.22;

    vec3 SPOT  = vec3(0.478, 0.141, 0.0);   // #7a2400 umbral spot
    vec3 EMBER = vec3(1.0, 0.416, 0.0);     // #ff6a00
    vec3 GOLD  = vec3(1.0, 0.722, 0.141);   // #ffb824
    vec3 CREAM = vec3(1.0, 0.953, 0.769);   // #fff3c4

    vec3 col = mix(SPOT, EMBER, smoothstep(0.18, 0.40, v));
    col = mix(col, GOLD, smoothstep(0.40, 0.62, v));
    col = mix(col, CREAM, smoothstep(0.62, 0.85, v));

    // Limb darkening: the photosphere dims and warms toward the edge
    float ndv = clamp(dot(normalize(vViewNormal), normalize(-vViewPos)), 0.0, 1.0);
    col *= mix(0.58, 1.0, pow(ndv, 0.55));

    col *= uTint;

    // Mesh view crossfades the photosphere to whichever mesh style is
    // selected (see MESH_SUN_STYLE). Both stay solid — depth written,
    // alpha 1 — because the sun's depth buffer is what culls the far
    // half of the corona shell.
    if (uMesh > 0.0) {
      vec3 meshCol = uMeshStyle < 0.5
        ? sunMeshDisco(p, ndv)
        : sunMeshWire(p, ndv, v);
      col = mix(col, meshCol, uMesh);
    }

    gl_FragColor = vec4(col, 1.0);
  }
`
  .replace("__NOISE__", NOISE_GLSL)
  .replace("__SUNWIRE__", SUN_WIRE_GLSL)
  .replace("__DISCO__", DISCO_GLSL)
  .replace("__MESH_STYLES__", MESH_STYLES_GLSL);

export function createSunSurfaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      // Written per frame by Sun (view tint lerp)
      uTint: { value: new THREE.Color(1, 1, 1) },
      // Written per frame by Sun, from the shared space/mesh crossfade
      uMesh: { value: 0 },
      // 0 = mirror ball, 1 = the neon wire cage (see MESH_SUN_STYLE)
      uMeshStyle: { value: MESH_SUN_STYLE === "wire" ? 1 : 0 },
      // Written per frame by Sun: the eased hover, 0..1 — the mirror
      // ball's spots brighten and widen with it
      uHover: { value: 0 },
    },
  });
}

// The corona is a 3D SHELL enveloping the sun (rendered back-side, like
// Earth's atmosphere), not a billboard. Each fragment computes the
// impact parameter b — the perpendicular distance from the sun's center
// to its own view ray. Rays tangent to the sphere have b == R exactly,
// so (b − R) measures distance past the limb using the GPU's own
// projection: the glow is aligned with the silhouette by construction,
// from any camera angle, with no screen-space math to drift. The sun
// sphere's depth buffer hides the shell inside the silhouette.
const CORONA_VERTEX = /* glsl */ `
  varying vec3 vViewPos;
  varying vec3 vCenterView;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPosition.xyz;
    // The sun's center (the shell's origin) in view space
    vCenterView = (modelViewMatrix * vec4(0.0, 0.0, 0.0, 1.0)).xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const CORONA_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform float uSunR;   // sun radius, world units (incl. group scale)
  uniform float uRingW;  // nominal flare band width, world units
  uniform float uIntensity;
  uniform vec3 uColorInner;
  uniform vec3 uColorOuter;
  varying vec3 vViewPos;
  varying vec3 vCenterView;

  void main() {
    // Impact parameter: perpendicular distance from the sun's center to
    // this fragment's view ray (camera at the view-space origin)
    vec3 rayDir = normalize(vViewPos);
    float b = length(vCenterView - dot(vCenterView, rayDir) * rayDir);

    // Angle around the disc (view-plane approximation) for the lobes
    vec2 p = vViewPos.xy - vCenterView.xy;
    float ang = atan(p.y, p.x);
    float t = uTime;

    // Undulating rim: layered angular waves...
    float base =
        0.55
      + 0.26 * sin(ang * 3.0 + t * 0.43)
      + 0.17 * sin(ang * 5.0 - t * 0.71)
      + 0.11 * sin(ang * 9.0 + t * 1.13);
    // ...plus localized eruptions that travel around the disc and pulse,
    // overshooting the nominal width — the visible "flares"
    float burst1 =
      pow(max(sin(ang - t * 0.23), 0.0), 8.0) * (0.5 + 0.5 * sin(t * 0.9));
    float burst2 =
      pow(max(sin(ang * 2.0 + t * 0.17 + 2.1), 0.0), 10.0) *
      (0.5 + 0.5 * sin(t * 0.63 + 1.7));
    float flare = clamp(base, 0.2, 1.3) + 1.9 * (burst1 + burst2);

    float w = uRingW * flare;
    float x = (b - uSunR) / max(w, 1e-4);
    if (x < 0.0) discard; // inside the silhouette (sun depth hides it too)
    float ring = exp(-x * 2.2);

    vec3 col = mix(uColorOuter, uColorInner, clamp(1.0 - x * 0.6, 0.0, 1.0));
    float alpha = ring * uIntensity;
    if (alpha < 0.004) discard;
    gl_FragColor = vec4(col, alpha);
  }
`;

export function createSunCoronaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: CORONA_VERTEX,
    fragmentShader: CORONA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    // Back side only: one shell layer per ray (no double-brightness), and
    // the far half behind the sun's limb is depth-culled by the sun
    // itself, so occlusion inside the silhouette is pixel-exact
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    uniforms: {
      uTime: { value: 0 },
      uSunR: { value: 1 }, // written per frame
      uRingW: { value: 0.1 }, // written per frame (screen-space target)
      uIntensity: { value: 1 },
      uColorInner: { value: new THREE.Color("#ffd27a") },
      uColorOuter: { value: new THREE.Color("#ff7a1a") },
    },
  });
}
