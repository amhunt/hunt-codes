import * as THREE from "three";

import type { PlanetKind } from "../landingScene";

/**
 * Procedural equirectangular textures for the sun and planets,
 * generated on a 2D canvas at runtime (no image assets). The sun/planet
 * style is ported from the hunt-codes-3 prototype: soft radial-gradient
 * blotches over a base color, wrapped horizontally so the sphere seam is
 * less obvious.
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
 * Soft radial-gradient blotches, repeated at x±w so the pattern tiles
 * across the sphere's horizontal seam — and drawn pole-aware for the
 * equirectangular mapping: rows near the top/bottom of the texture get
 * squeezed onto tiny polar circles, so blotches there are pre-stretched
 * horizontally by 1/cos(latitude) (round again on the sphere) and the
 * latitude is sampled so density stays uniform per unit sphere area
 * (uniform sampling would pile blotches up at the poles). Without this
 * the poles read as a pinched radial smear.
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
    // Uniform in sin(latitude) => uniform per unit sphere area
    const lat = Math.asin(Math.random() * 2 - 1);
    const y = (0.5 + lat / Math.PI) * h;
    const r = minR + Math.random() * (maxR - minR);
    const stretch = 1 / Math.max(Math.cos(lat), 0.08);
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, r);
    const color = colors[Math.floor(Math.random() * colors.length)];
    gradient.addColorStop(0, color);
    gradient.addColorStop(1, "rgba(0,0,0,0)");
    ctx.globalAlpha = alpha;
    ctx.fillStyle = gradient;
    for (const wrapX of [x, x - w, x + w]) {
      ctx.setTransform(stretch, 0, 0, 1, wrapX, y);
      ctx.fillRect(-r, -r, r * 2, r * 2);
    }
    ctx.setTransform(1, 0, 0, 1, 0, 0);
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
  drawBlotches(
    ctx,
    w,
    h,
    26,
    w * 0.04,
    w * 0.13,
    ["#3d7a3a", "#4c8a40", "#7a6a3d"],
    0.85,
  );
  drawBlotches(ctx, w, h, 60, w * 0.01, w * 0.04, ["#2f6631", "#8a7a4a"], 0.5);
  // Polar caps — thin: the home camera hovers right over the north pole,
  // and a fat white cap there makes the night side read gray, not Earth
  ctx.fillStyle = "rgba(240, 248, 255, 0.9)";
  ctx.fillRect(0, 0, w, h * 0.025);
  ctx.fillRect(0, h * 0.97, w, h * 0.03);
  // Clouds
  drawBlotches(
    ctx,
    w,
    h,
    90,
    w * 0.015,
    w * 0.07,
    ["rgba(255,255,255,0.9)"],
    0.22,
  );
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

/** Soft warm radial glow for the sun's wide ambience billboard (the
 *  animated surface + flare corona are shaders — see solar/sunShaders). */
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

/** The GitHub mark (Octocat silhouette), from simple-icons (CC0), in a
 *  24x24 viewBox. */
const GITHUB_MARK_PATH =
  "M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113." +
  "82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-" +
  "1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 " +
  "1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998." +
  "108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31." +
  "465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 " +
  "1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 " +
  "3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 " +
  "1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 " +
  "1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 " +
  "17.592 24 12.297c0-6.627-5.373-12-12-12";

/** The LinkedIn logo (rounded square with "in" knocked out), from
 *  simple-icons (CC0), in a 24x24 viewBox. */
const LINKEDIN_MARK_PATH =
  "M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 " +
  "0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 " +
  "1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 " +
  "7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 " +
  "1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 " +
  "13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 " +
  "1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 " +
  "22.271V1.729C24 .774 23.2 0 22.225 0z";

/** The RSS/feed mark (dot + two arcs) — the generic "blog" icon — from
 *  simple-icons (CC0), in a 24x24 viewBox. */
const RSS_MARK_PATH =
  "M19.199 24C19.199 13.467 10.533 4.8 0 4.8V0c13.165 0 24 10.835 24 " +
  "24h-4.801zM3.291 17.415c1.814 0 3.293 1.479 3.293 3.295 0 1.813-1.485 " +
  "3.29-3.301 3.29C1.47 24 0 22.526 0 20.71s1.475-3.294 3.291-3.295zM15." +
  "909 24h-4.665c0-6.169-5.075-11.245-11.244-11.245V8.09c8.727 0 15.909 " +
  "7.184 15.909 15.91z";

/** A simple play triangle (Material Design play arrow), in a 24x24
 *  viewBox — the moon's "watch the video" badge. */
const PLAY_MARK_PATH = "M8 5v14l11-7z";

export type AsteroidLogo = "github" | "linkedin" | "blog" | "play";

const LOGO_MARKS: Record<
  AsteroidLogo,
  { path: string; color: string; scale: number }
> = {
  github: { path: GITHUB_MARK_PATH, color: "#5000f0", scale: 0.72 },
  // The square marks are scaled down so they don't overwhelm the asteroid
  linkedin: { path: LINKEDIN_MARK_PATH, color: "#0a66c2", scale: 0.6 },
  blog: { path: RSS_MARK_PATH, color: "#f26522", scale: 0.6 },
  play: { path: PLAY_MARK_PATH, color: "#412596", scale: 0.85 },
};

/** Brand mark on a transparent canvas — a "sticker" decal for the link
 *  asteroids (no background disc: the mark sits directly on the rock). */
export function createLogoBadgeTexture(
  logo: AsteroidLogo,
): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const c = size / 2;

  const mark = LOGO_MARKS[logo];
  const scale = (size / 24) * mark.scale;
  ctx.translate(c, c);
  ctx.scale(scale, scale);
  ctx.translate(-12, -16);
  ctx.fillStyle = mark.color;
  ctx.fill(new Path2D(mark.path));
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  return asTexture(canvas);
}
