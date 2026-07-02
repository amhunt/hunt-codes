import React from "react";
import { Canvas } from "@react-three/fiber";

/**
 * Single shared fullscreen WebGL canvas for all background 3D scenes
 * (star field, solar-system planets, moon). World units are CSS pixels:
 * the orthographic camera frustum matches the viewport, origin at screen
 * center, y up. Use domToWorld to convert DOM coordinates.
 *
 * The canvas is pointer-events:none and sits above the flat background
 * layers but below page content, so scenes can draw over decorative SVG
 * (orbit lines) without stealing clicks from links.
 */

export const domToWorldX = (x: number, viewportWidth: number) =>
  x - viewportWidth / 2;
export const domToWorldY = (y: number, viewportHeight: number) =>
  viewportHeight / 2 - y;

// Scene depth layout (world z). Stars sit at the back; occluders and
// opaque bodies in front of them cull stars via the depth buffer.
export const Z_STARS = 0;
export const Z_OCCLUDER = 40;
export const Z_BODIES = 60;

const SpaceCanvas = ({ children }: { children: React.ReactNode }) => {
  return (
    <Canvas
      className="space-canvas"
      // Merged over R3F's inline wrapper defaults (position: relative);
      // z-index and pointer-events live in the .space-canvas SCSS rule so
      // the stacking contract stays in one place (App.scss)
      style={{ position: "fixed", inset: 0 }}
      orthographic
      flat
      camera={{ position: [0, 0, 1000], near: 0.1, far: 4000, zoom: 1 }}
      dpr={[1, 2]}
      gl={{ alpha: true, antialias: true }}
    >
      {children}
    </Canvas>
  );
};

export default SpaceCanvas;
