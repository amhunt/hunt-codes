let cachedSupport: boolean | null = null;

/**
 * Detects working WebGL support (also false in test/DOM-emulation
 * environments like happy-dom). Used to gate the 3D background: when
 * false, callers fall back to the legacy DOM/SVG rendering paths.
 */
export default function supportsWebGL(): boolean {
  if (cachedSupport != null) return cachedSupport;
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl2") ||
      canvas.getContext("webgl") ||
      canvas.getContext("experimental-webgl");
    cachedSupport = gl != null && typeof (gl as WebGLRenderingContext).getParameter === "function";
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}
