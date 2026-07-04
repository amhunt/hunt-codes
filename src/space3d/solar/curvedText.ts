import { useEffect, useState } from "react";
import * as THREE from "three";

import retroFloralUrl from "../../RetroFloral.ttf";

/**
 * Shared helpers for the curved ring labels ("ENTER" around the sun,
 * "ABOUT ME" around Earth). Each glyph is rasterized to its own canvas
 * texture and hung on a small plane mesh; the calling component arranges the
 * planes along an arc (flat in the world for the top-down sun, billboarded
 * for the perspective Earth). The font is the bundled Retro Floral face.
 */

/** `400 <px>px "Retro Floral"` — the family the ring labels render in. */
export const retroFloralFont = (px: number) => `400 ${px}px "Retro Floral"`;

let faceRegistered: Promise<void> | null = null;

/** Register the bundled Retro Floral face with the document exactly once. */
function registerRetroFloralFace(): Promise<void> {
  if (!faceRegistered) {
    faceRegistered = (async () => {
      const face = new FontFace("Retro Floral", `url(${retroFloralUrl})`);
      const loaded = await face.load();
      document.fonts.add(loaded);
    })();
  }
  return faceRegistered;
}

/**
 * Resolve once Retro Floral is ready to rasterize at the *exact* `probeFont`
 * string. `document.fonts.load` must be awaited per size string — loading one
 * size doesn't guarantee a fresh offscreen canvas will use the face at another
 * size, which is what made the labels intermittently fall back to serif.
 */
export async function ensureRetroFloralFont(probeFont: string): Promise<void> {
  await registerRetroFloralFace();
  await document.fonts.load(probeFont);
}

/** True once Retro Floral can be measured/rasterized for `probeFont`. */
export function useRetroFloralReady(probeFont: string): boolean {
  // Never trust `document.fonts.check()` for the initial value: it can report
  // the family as available before a specific size is committed for canvas
  // use. Always await the explicit per-size load below before rasterizing.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    void (async () => {
      try {
        await ensureRetroFloralFont(probeFont);
      } catch {
        // Give up gracefully — the canvas will use a fallback rather than hang
      }
      if (!cancelled) setReady(true);
    })();
    return () => {
      cancelled = true;
    };
  }, [probeFont]);

  return ready;
}

export interface CurvedLetter {
  material: THREE.MeshBasicMaterial;
  geometry: THREE.PlaneGeometry;
  position: THREE.Vector3;
  quaternion: THREE.Quaternion;
}

/** Rasterize one glyph to an unlit, always-on-top plane mesh. */
export function createLetterPlane(
  char: string,
  widthPx: number,
  fontSizePx: number,
  worldFontSize: number,
  font: string,
): CurvedLetter {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d")!;
  const pad = 4;
  const cssW = Math.max(Math.ceil(widthPx) + pad * 2, 8);
  const cssH = Math.max(Math.ceil(fontSizePx * 1.25) + pad * 2, 8);
  canvas.width = cssW * dpr;
  canvas.height = cssH * dpr;
  ctx.scale(dpr, dpr);
  ctx.font = font;
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(char, cssW / 2, cssH / 2);

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const material = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    toneMapped: false,
    depthTest: false,
    depthWrite: false,
    side: THREE.DoubleSide,
  });
  const aspect = cssW / cssH;
  const geometry = new THREE.PlaneGeometry(
    worldFontSize * aspect,
    worldFontSize,
  );

  return {
    material,
    geometry,
    position: new THREE.Vector3(),
    quaternion: new THREE.Quaternion(),
  };
}

/** Per-character advance widths for `text` at `font`, with a fallback width. */
export function measureCharWidths(
  text: string,
  font: string,
  fallback: number,
): number[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.split("").map(() => fallback);
  ctx.font = font;
  return text.split("").map((char) => {
    const width = ctx.measureText(char).width;
    return width > 0 ? width : fallback;
  });
}
