import * as THREE from "three";

import type { PlanetKind } from "../landingScene";

/**
 * Procedural equirectangular textures for the planets and moon, generated
 * on a 2D canvas at runtime (no image assets). Palettes match the radial
 * gradients in Landing.tsx's fallback defs / MoonSvg.tsx.
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

/** Horizontal gas-giant style bands with slight per-row wobble. */
const drawBands = (
  ctx: CanvasRenderingContext2D,
  palette: string[],
  wobble: number,
) => {
  ctx.fillStyle = palette[0];
  ctx.fillRect(0, 0, TEX_W, TEX_H);
  let y = 0;
  let i = 0;
  while (y < TEX_H) {
    const bandHeight = 4 + Math.random() * 14;
    ctx.fillStyle = palette[i % palette.length];
    ctx.globalAlpha = 0.75 + Math.random() * 0.25;
    // Slight sinusoidal offset to avoid perfectly straight band edges
    for (let x = 0; x < TEX_W; x += 4) {
      const offset = Math.sin((x / TEX_W) * Math.PI * 4 + i) * wobble;
      ctx.fillRect(x, y + offset, 4, bandHeight);
    }
    y += bandHeight * 0.85;
    i++;
  }
  ctx.globalAlpha = 1;
};

/** Random soft blotches, for rocky surfaces and band turbulence. */
const drawBlotches = (
  ctx: CanvasRenderingContext2D,
  colors: string[],
  count: number,
  minR: number,
  maxR: number,
  alpha: number,
) => {
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = colors[Math.floor(Math.random() * colors.length)];
    ctx.globalAlpha = alpha * (0.5 + Math.random() * 0.5);
    const r = minR + Math.random() * (maxR - minR);
    const x = Math.random() * TEX_W;
    const y = Math.random() * TEX_H;
    ctx.beginPath();
    ctx.ellipse(
      x,
      y,
      r * (1 + Math.random()),
      r,
      Math.random() * Math.PI,
      0,
      Math.PI * 2,
    );
    ctx.fill();
  }
  ctx.globalAlpha = 1;
};

export function createPlanetTexture(kind: PlanetKind): THREE.CanvasTexture {
  const canvas = createCanvas(TEX_W, TEX_H);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  switch (kind) {
    case "mars":
      // Red rocky surface (palette from the old planet1Gradient)
      ctx.fillStyle = "#872c22";
      ctx.fillRect(0, 0, TEX_W, TEX_H);
      drawBlotches(ctx, ["#aa4135", "#93362a", "#7a251c"], 90, 3, 14, 0.4);
      drawBlotches(ctx, ["#62170f", "#511009"], 60, 2, 10, 0.45);
      // Polar caps
      ctx.fillStyle = "#d8b49f";
      ctx.globalAlpha = 0.5;
      ctx.fillRect(0, 0, TEX_W, 5);
      ctx.fillRect(0, TEX_H - 5, TEX_W, 5);
      ctx.globalAlpha = 1;
      break;
    case "neptune":
      drawBands(ctx, ["#195882", "#347dae", "#0e476d", "#2a6f9e"], 2);
      drawBlotches(ctx, ["#4a90c0"], 10, 4, 12, 0.25);
      break;
    case "saturn":
      drawBands(
        ctx,
        ["#c76714", "#e98e3e", "#8d480c", "#d8791f", "#b05a10"],
        1.5,
      );
      break;
    case "ice":
      // Green ice giant (palette from the old planet4Gradient)
      drawBands(ctx, ["#1a8920", "#32ae38", "#127117", "#26982c"], 2.5);
      drawBlotches(ctx, ["#3fbf46"], 8, 3, 10, 0.2);
      break;
  }
  return asTexture(canvas);
}

/**
 * Annulus texture for Saturn's ring, mapped onto a flat plane:
 * transparent outside/inside, concentric bands with a Cassini-style gap.
 */
export function createRingTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, "rgba(0,0,0,0)");
  gradient.addColorStop(0.52, "rgba(0,0,0,0)");
  gradient.addColorStop(0.56, "rgba(233,142,62,0.75)");
  gradient.addColorStop(0.68, "rgba(199,103,20,0.8)");
  gradient.addColorStop(0.72, "rgba(141,72,12,0.15)"); // Cassini gap
  gradient.addColorStop(0.76, "rgba(233,142,62,0.7)");
  gradient.addColorStop(0.9, "rgba(199,103,20,0.55)");
  gradient.addColorStop(1, "rgba(141,72,12,0)");
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
