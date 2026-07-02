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
    cachedSupport =
      gl != null &&
      typeof (gl as WebGLRenderingContext).getParameter === "function";
    // Release the probe context right away — contexts are a capped
    // browser resource and this one is never used again
    (gl as WebGLRenderingContext | null)
      ?.getExtension?.("WEBGL_lose_context")
      ?.loseContext();
  } catch {
    cachedSupport = false;
  }
  return cachedSupport;
}
