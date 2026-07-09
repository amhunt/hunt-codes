import React from "react";
import { Canvas } from "@react-three/fiber";

/**
 * Single shared fullscreen WebGL canvas for the pixel-space background
 * scenes (the star field). World units are CSS pixels: the orthographic
 * camera frustum matches the viewport, origin at screen center, y up.
 * Use domToWorld to convert DOM coordinates.
 *
 * The canvas is pointer-events:none and sits above the flat background
 * layers but below page content, so scenes can draw over decorative SVG
 * (orbit lines) without stealing clicks from links.
 */

export const domToWorldX = (x: number, viewportWidth: number) =>
  x - viewportWidth / 2;
export const domToWorldY = (y: number, viewportHeight: number) =>
  viewportHeight / 2 - y;

// Scene depth layout (world z)
export const Z_STARS = 0;

const SpaceCanvas = ({ children }: { children: React.ReactNode }) => {
  return (
    <Canvas
      className="space-canvas"
      // Merged over R3F's inline wrapper defaults. pointerEvents MUST be
      // inline: fiber v9's event system writes an inline pointer-events
      // on its wrapper, which would override the .space-canvas SCSS rule
      // and swallow clicks meant for links underneath (e.g. the landing
      // sun's "enter"). z-index stays in the SCSS rule with the rest of
      // the stacking contract (App.scss).
      style={{ position: "fixed", inset: 0, pointerEvents: "none" }}
      // Background scenes never take pointer input; keep the canvas
      // element itself click-through as well
      onCreated={({ gl }) => {
        gl.domElement.style.pointerEvents = "none";
      }}
      orthographic
      flat
      camera={{ position: [0, 0, 1000], near: 0.1, far: 4000, zoom: 1 }}
      // Cap DPR at 1.5: on retina, 2x meant ~78% more pixels for a soft
      // star field where the difference is invisible
      dpr={[1, 1.5]}
      // No MSAA: this canvas only draws alpha-blended point sprites, which
      // antialiasing does nothing for — skip the multisample cost entirely
      gl={{
        alpha: true,
        antialias: false,
        powerPreference: "high-performance",
      }}
    >
      {children}
    </Canvas>
  );
};

export default SpaceCanvas;
