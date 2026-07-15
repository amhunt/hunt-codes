/**
 * Shared spec for the space synth (the 808-pad easter egg): the synth
 * solar system's world placement, the knob-planet layout, and the DOM
 * anchor ids that glue the /synth overlays to the 3D bodies. Three-free
 * so the page components (Synth.tsx, SolarOverlays) can import it
 * without dragging three.js out of its lazy chunk; the 3D side
 * (SynthSystem, CameraRig, RocketJourney) reads the same numbers.
 */

export type SynthParam =
  "wave" | "cutoff" | "resonance" | "echo" | "wobble" | "tempo";

export interface SynthKnobSpec {
  param: SynthParam;
  /** Overlay label under the planet */
  label: string;
  /** Planet surface color (also its glow) */
  color: string;
  /** Planet radius, world units */
  radius: number;
  orbitRadius: number;
  /** Fixed bearing on the ring, radians (planets sway around it but
   *  don't orbit away — knobs that wander off-screen aren't knobs) */
  orbitPhase: number;
  /** Steps for discrete knobs (wave: 4); continuous when absent */
  steps?: number;
  /** Labels for discrete steps, shown instead of a percentage */
  stepNames?: string[];
}

/**
 * The synth system's sun sits far below the real solar system — past
 * the camera's far plane from either vantage, so the two systems can
 * never photobomb each other.
 */
export const SYNTH_ORIGIN = { x: 0, y: -1600, z: 0 };

/** Top-down synth view: camera height over the synth sun (mirrors the
 *  landing view's straight-down orbital-diagram framing) */
export const SYNTH_CAM_HEIGHT = 32;

/**
 * The knob planets. Screen mapping under the top-down camera: world +x
 * is screen-right, world +z is screen-down. The outer planets ride
 * bearings near the vertical axis (|x| ≲ 6.6) so the whole panel stays
 * on screen down to phone aspect.
 */
export const SYNTH_KNOBS: SynthKnobSpec[] = [
  {
    // Stepper: click cycles the waveform, and the planet wears the
    // selected shape as an oscilloscope trace (bigger radius so the
    // trace stays legible from the top-down camera)
    param: "wave",
    label: "wave",
    color: "#cfd6dd",
    radius: 1.15,
    orbitRadius: 4.2,
    orbitPhase: 5.9,
    steps: 4,
    stepNames: ["sine", "triangle", "saw", "square"],
  },
  {
    param: "cutoff",
    label: "nebula filter",
    color: "#9e80f9",
    radius: 1.5,
    orbitRadius: 7.5,
    orbitPhase: 0.75,
  },
  {
    param: "resonance",
    label: "ring resonance",
    color: "#ff6b6b",
    radius: 1,
    orbitRadius: 6,
    orbitPhase: 2.6,
  },
  {
    param: "echo",
    label: "space echo",
    color: "#5efffc",
    radius: 1.1,
    orbitRadius: 9,
    orbitPhase: 4,
  },
  {
    param: "wobble",
    label: "gravity wobble",
    color: "#ffd23f",
    radius: 0.9,
    orbitRadius: 7,
    orbitPhase: 1.75,
  },
  {
    param: "tempo",
    label: "warp tempo",
    color: "#7ccf4f",
    radius: 1.05,
    orbitRadius: 10,
    orbitPhase: 4.9,
  },
];

export const synthKnobAnchorId = (param: SynthParam) => `synth-knob-${param}`;
export const SYNTH_SUN_ANCHOR_ID = "synth-sun-button";

/**
 * Hover/drag flags for the knob overlays, bridged into the WebGL scene
 * the same way solarHover works: the DOM sets them, SynthSystem reads
 * them per frame to glow the hovered planet.
 */
export const synthUiState = {
  activeKnob: null as SynthParam | null,
};
