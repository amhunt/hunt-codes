import * as THREE from "three";

/**
 * GLSL sun for the landing solar system. The SVG keeps the "enter" link
 * ring; this replaces the flat radial-gradient disc with an animated
 * plasma surface (value-noise fbm + limb darkening + granulation) and a
 * soft additive corona. Both materials take a single uTime uniform, ticked
 * from the render loop in SolarSystem3D.
 *
 * Geometry convention: rendered on a unit circle whose uv is centered at
 * (0.5, 0.5), so the fragment shader works in p = (uv - 0.5) * 2, i.e.
 * a [-1, 1] disc with r = length(p) running 0 (center) -> 1 (rim).
 *
 * Time is periodic by construction: uTime is wrapped to SUN_TIME_PERIOD
 * on the CPU and the shaders sample noise along a circle whose angular
 * frequency matches that period, so every value stays small enough for
 * fp32 (an unbounded `fract(bigNumber * 456.21)` in hash() would decay
 * into blocky banding after ~20 minutes on a parked tab) and the wrap
 * itself is seamless.
 */

/** Wrap length for the uTime uniform, seconds. Loops seamlessly. */
export const SUN_TIME_PERIOD = 120;
const OMEGA = ((Math.PI * 2) / SUN_TIME_PERIOD).toFixed(8);

/** Corona quad radius as a multiple of the sun surface radius. */
export const SUN_CORONA_RATIO = 1.55;
/** Depth-occluder radius (hides GPU stars behind the disc + ring). */
export const SUN_OCCLUDER_RATIO = 1.07;

// Hash-based 2D value noise + fbm. Cheap, tileable enough for a churning
// surface, and no texture lookups. FBM_OCTAVES is #defined per shader
// (WebGL1 needs constant loop bounds).
const NOISE_GLSL = /* glsl */ `
  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }

  float valueNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = hash(i);
    float b = hash(i + vec2(1.0, 0.0));
    float c = hash(i + vec2(0.0, 1.0));
    float d = hash(i + vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float sum = 0.0;
    float amp = 0.5;
    for (int i = 0; i < FBM_OCTAVES; i++) {
      sum += amp * valueNoise(p);
      p *= 2.02;
      amp *= 0.5;
    }
    return sum;
  }

  // Noise-space offset moving on a circle: drifts at speed |radius *
  // OMEGA| yet stays bounded and loops exactly once per SUN_TIME_PERIOD.
  vec2 orbit(float t, float radius, float phase) {
    float a = t * ${OMEGA} + phase;
    return radius * vec2(cos(a), sin(a));
  }
`;

const VERTEX = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SURFACE_FRAGMENT = /* glsl */ `
  precision highp float;
  #define FBM_OCTAVES 5
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;

  ${NOISE_GLSL}

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    // Two noise fields drifting along different circles => churning
    // plasma (orbit radii chosen to match the old linear drift speeds)
    float n1 = fbm(p * 3.0 + orbit(uTime, 1.3, 0.0));
    float n2 = fbm(p * 6.0 - orbit(uTime, 1.4, 2.1));
    float turb = mix(n1, n2, 0.5);

    // Warm ramp from deep orange (edge) through gold to a warm-cream core.
    // The core stops well short of white so the surface reads matte rather
    // than shiny.
    vec3 deep = vec3(0.82, 0.28, 0.02);
    vec3 gold = vec3(1.0, 0.72, 0.06);
    vec3 hot = vec3(1.0, 0.86, 0.5);
    float heat = clamp(turb * 0.8 + (1.0 - r) * 0.55, 0.0, 1.0);
    vec3 color = mix(deep, gold, smoothstep(0.15, 0.6, heat));
    color = mix(color, hot, smoothstep(0.7, 1.05, heat));

    // Darker granulation cells + a couple of drifting sunspots
    float cells = fbm(p * 10.0 + orbit(uTime, 1.2, 4.2));
    color *= 0.78 + 0.22 * cells;

    // Limb darkening toward the rim
    color *= 0.55 + 0.45 * pow(1.0 - r * r, 0.6);

    // Feather the very edge so the disc doesn't alias against the stars
    float alpha = 1.0 - smoothstep(0.965, 1.0, r);
    gl_FragColor = vec4(color, alpha * uOpacity);
  }
`;

// The corona covers the largest screen area of the scene, so it gets a
// cheaper 3-octave fbm — soft glow doesn't need the fine octaves.
const CORONA_FRAGMENT = /* glsl */ `
  precision highp float;
  #define FBM_OCTAVES 3
  varying vec2 vUv;
  uniform float uTime;
  uniform float uOpacity;

  ${NOISE_GLSL}

  void main() {
    vec2 p = (vUv - 0.5) * 2.0;
    float r = length(p);
    if (r > 1.0) discard;

    // Radial falloff from the disc edge (r ~ 1/SUN_CORONA_RATIO) outward —
    // deliberately tight and faint: a haze hugging the limb, not big flares
    float glow = smoothstep(1.0, 0.52, r);
    glow = pow(glow, 2.2);

    // Flickering licks of flame around the limb. Sampled in Cartesian
    // space — an angular coordinate (atan) would put a seam where the
    // angle wraps, since the value noise isn't periodic.
    float flames = fbm(p * 3.2 + orbit(uTime, 4.8, 0.7));
    glow *= 0.65 + 0.5 * flames;

    vec3 coronaColor = vec3(1.0, 0.55, 0.12);
    // Additive material: alpha scales the contribution
    gl_FragColor = vec4(coronaColor, glow * 0.45 * uOpacity);
  }
`;

export function createSunSurfaceMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: VERTEX,
    fragmentShader: SURFACE_FRAGMENT,
    transparent: true,
  });
}

export function createSunCoronaMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: VERTEX,
    fragmentShader: CORONA_FRAGMENT,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
}
