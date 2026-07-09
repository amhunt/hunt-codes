import * as THREE from "three";

/**
 * GLSL for the sun's two shader materials:
 *
 * - Surface: domain-warped fbm noise over the sphere, animated in time so
 *   the convection cells and dark spots drift, grow and dissolve (the old
 *   static canvas texture couldn't evolve). Limb darkening keeps the
 *   close-up home view reading as a photosphere rather than a flat disc.
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

  void main() {
    vObjPos = position;
    vViewNormal = normalMatrix * normal;
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewPos = mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

// Palette matches the old canvas texture (#ffb824 base, #ff6a00 embers,
// #fff3c4 highlights) plus a deep umbral tone for the dark spots.
const SURFACE_FRAGMENT = /* glsl */ `
  uniform float uTime;
  uniform vec3 uTint;
  varying vec3 vObjPos;
  varying vec3 vViewNormal;
  varying vec3 vViewPos;

  ${""}
  __NOISE__

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

    gl_FragColor = vec4(col * uTint, 1.0);
  }
`.replace("__NOISE__", NOISE_GLSL);

export function createSunSurfaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    vertexShader: SURFACE_VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    uniforms: {
      uTime: { value: 0 },
      // Written per frame by Sun (day/night tint lerp)
      uTint: { value: new THREE.Color(1, 1, 1) },
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
