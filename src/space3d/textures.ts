import * as THREE from "three";

import type { PlanetKind } from "../landingScene";

/**
 * Procedural equirectangular textures for the sun, planets and moon,
 * generated on a 2D canvas at runtime (no image assets). The sun/planet
 * style is ported from the hunt-codes-3 prototype: soft radial-gradient
 * blotches over a base color, wrapped horizontally so the sphere seam is
 * less obvious. Palettes match the fallback radialGradient defs in
 * Landing.tsx / MoonSvg.tsx.
 */

export type { PlanetKind };

const TEX_W = 256;
const TEX_H = 128;

const createCanvas = (w: number, h: number) => {
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  return canvas;
};

const asTexture = (canvas: HTMLCanvasElement) => {
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 2;
  return texture;
};

/**
 * Soft circular radial-gradient blotches, repeated at x±w so the pattern
 * tiles across the sphere's horizontal seam.
 */
const drawBlotches = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  count: number,
  minR: number,
  maxR: number,
  colors: string[],
  alpha: number,
) => {
  for (let i = 0; i < count; i++) {
    const x = Math.random() * w;
    const y = Math.random() * h;
    const r = minR + Math.random() * (maxR - minR);
    const gradient = ctx.createRadialGradient(x, y, 0, x, y, r);
    const color = colors[Math.floor(Math.random() * colors.length)];
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    ctx.fillRect(x - r, y - r, r * 2, r * 2);
    ctx.fillRect(x - r - w, y - r, r * 2, r * 2);
    ctx.fillRect(x - r + w, y - r, r * 2, r * 2);
  }
  ctx.globalAlpha = 1;
};

/** Cratered/mottled surface: base fill + large soft spots + fine grain. */
const drawRocky = (
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  base: string,
  spot: string,
  spot2: string,
) => {
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);
  drawBlotches(ctx, w, h, 220, 4, 30, [spot, spot2], 0.25);
  drawBlotches(ctx, w, h, 400, 1, 6, [spot2, "#000000"], 0.2);
};

const drawEarth = (ctx: CanvasRenderingContext2D, w: number, h: number) => {
  const ocean = ctx.createLinearGradient(0, 0, 0, h);
  ocean.addColorStop(0, "#1c3f7a");
  ocean.addColorStop(0.5, "#20549c");
  ocean.addColorStop(1, "#1c3f7a");
  ctx.fillStyle = ocean;
  ctx.fillRect(0, 0, w, h);
  // Continents
  drawBlotches(ctx, w, h, 26, w * 0.04, w * 0.13, ["#3d7a3a", "#4c8a40", "#7a6a3d"], 0.85);
  drawBlotches(ctx, w, h, 60, w * 0.01, w * 0.04, ["#2f6631", "#8a7a4a"], 0.5);
  // Polar caps
  ctx.fillStyle = "rgba(240, 248, 255, 0.9)";
  ctx.fillRect(0, 0, w, h * 0.05);
  ctx.fillRect(0, h * 0.94, w, h * 0.06);
  // Clouds
  drawBlotches(ctx, w, h, 90, w * 0.015, w * 0.07, ["rgba(255,255,255,0.9)"], 0.22);
};

export function createPlanetTexture(kind: PlanetKind): THREE.CanvasTexture {
  const w = kind === "earth" ? 512 : TEX_W;
  const h = kind === "earth" ? 256 : TEX_H;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  switch (kind) {
    case "mercury":
      drawRocky(ctx, w, h, "#9d938a", "#6e655d", "#c4bab0");
      break;
    case "venus":
      drawRocky(ctx, w, h, "#d9b26a", "#b58a3e", "#f0d9a0");
      break;
    case "earth":
      drawEarth(ctx, w, h);
      break;
    case "mars":
      drawRocky(ctx, w, h, "#c1583b", "#8a3b24", "#e0855e");
      break;
  }
  return asTexture(canvas);
}

/** Mottled golden sun surface (unlit; pair with the glow billboard). */
export function createSunTexture(): THREE.CanvasTexture {
  const w = 512;
  const h = 256;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  ctx.fillStyle = "#ffb824";
  ctx.fillRect(0, 0, w, h);
  drawBlotches(ctx, w, h, 240, 6, 40, ["#ff8c00", "#ffd75e", "#ff6a00"], 0.35);
  drawBlotches(ctx, w, h, 300, 2, 10, ["#fff3c4"], 0.3);
  return asTexture(canvas);
}

/** Soft warm radial glow for the sun's corona billboard. */
export function createSunGlowTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, "rgba(255, 210, 120, 0.55)");
  gradient.addColorStop(0.35, "rgba(255, 160, 60, 0.22)");
  gradient.addColorStop(1, "rgba(255, 120, 20, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return asTexture(canvas);
}

/** Dark blue/purple moon surface (palette from the old MoonSvg gradient). */
export function createMoonTexture(): THREE.CanvasTexture {
  const canvas = createCanvas(TEX_W, TEX_H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const base = ctx.createLinearGradient(0, 0, TEX_W, TEX_H);
  base.addColorStop(0, "#080556");
  base.addColorStop(1, "#0a0030");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, TEX_W, TEX_H);

  // Craters: soft lighter discs with a darker rim
  for (let i = 0; i < 40; i++) {
    const r = 2 + Math.random() * 8;
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    ctx.globalAlpha = 0.25 + Math.random() * 0.3;
    ctx.fillStyle = "#150b6e";
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.3;
    ctx.strokeStyle = "#05012a";
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  return asTexture(canvas);
}
