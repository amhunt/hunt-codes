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

/** Soft purple halo marking a body as clickable (InteractiveGlow) — the
 *  site's accent color, distinct from the bodies' natural palette. */
export function createInteractiveGlowTexture(): THREE.CanvasTexture {
  const size = 128;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const c = size / 2;
  const gradient = ctx.createRadialGradient(c, c, 0, c, c, c);
  gradient.addColorStop(0, "rgba(158, 128, 249, 0.6)");
  gradient.addColorStop(0.45, "rgba(158, 128, 249, 0.22)");
  gradient.addColorStop(1, "rgba(158, 128, 249, 0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  return asTexture(canvas);
}

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

/** A movie camera (Material Design videocam), in a 24x24 viewBox — the
 *  moon's "watch the video" badge. Chosen over a bare play triangle
 *  because the moon links a film someone made, not a generic media
 *  control; it also survives the decal better than a clapperboard or film
 *  strip, whose sprocket holes and stripes mud together at moon scale.
 *  Body and lens wedge are both solid, so it needs no even-odd fill. */
const VIDEO_MARK_PATH =
  "M17 10.5V7c0-.55-.45-1-1-1H4c-.55 0-1 .45-1 1v10c0 .55.45 1 1 1h12c.55 " +
  "0 1-.45 1-1v-3.5l4 4v-11l-4 4z";

export type AsteroidLogo = "linkedin" | "blog" | "video";

const LOGO_MARKS: Record<
  AsteroidLogo,
  { path: string; color: string; scale: number }
> = {
  // The square marks are scaled down so they don't overwhelm the asteroid
  linkedin: { path: LINKEDIN_MARK_PATH, color: "#0a66c2", scale: 0.6 },
  blog: { path: RSS_MARK_PATH, color: "#f26522", scale: 0.6 },
  // Wider than the play triangle it replaced (18 viewBox units vs 11), so
  // it steps down a notch to keep the same visual weight on the moon and
  // to stop the decal wrapping further around the limb
  video: { path: VIDEO_MARK_PATH, color: "#412596", scale: 0.8 },
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

/** A heart (Material Design "favorite", Apache 2.0), in a 24x24 viewBox */
const HEART_PATH =
  "M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 " +
  "0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 " +
  "3.78-3.4 6.86-8.55 11.54L12 21.35z";

/** A red spray-paint heart tagged on the satellite's head (its SVG Studio
 *  link, /projects-and-toys): the mark goes down in a ring of jittered,
 *  translucent passes so the edge fuzzes like over-spray, then a solid
 *  core, slanted the way a tag gets sprayed, with two drips running off
 *  the bottom and a wet highlight on the upper lobe. Transparent
 *  canvas — a "sticker" decal, like the badges. */
export function createGraffitiHeartTexture(): THREE.CanvasTexture {
  const size = 256;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const c = size / 2;
  const heart = new Path2D(HEART_PATH);
  const scale = (size / 24) * 0.7;
  const spray = (dx: number, dy: number, alpha: number, grow: number) => {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.translate(c + dx, c + dy);
    ctx.rotate(-0.32);
    ctx.scale(scale * grow, scale * grow);
    ctx.translate(-12, -12.2);
    ctx.globalAlpha = alpha;
    ctx.fill(heart);
  };
  // Over-spray halo: offset passes at low alpha build a soft edge
  ctx.fillStyle = "#c81a26";
  for (let i = 0; i < 8; i++) {
    const a = i * 0.79;
    spray(Math.cos(a) * 6, Math.sin(a) * 6, 0.2, 1.06);
  }
  ctx.fillStyle = "#e8232f";
  spray(0, 0, 0.96, 1);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  // Drips off the lower lobe (their tops sit inside the solid fill)
  ctx.globalAlpha = 0.92;
  ctx.fillStyle = "#d61f2b";
  for (const [x, length] of [
    [c - 30, 36],
    [c + 2, 22],
  ]) {
    ctx.fillRect(x - 3, c + 28, 6, length);
    ctx.beginPath();
    ctx.arc(x, c + 28 + length, 4.5, 0, Math.PI * 2);
    ctx.fill();
  }
  // Wet highlight on the upper-left lobe
  ctx.globalAlpha = 0.4;
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.ellipse(c - 34, c - 30, 13, 6, -0.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.globalAlpha = 1;
  return asTexture(canvas);
}

/** The little video screen set into the satellite's head (its Zip
 *  launch-reel link, /projects-and-toys): dark glass with a purple
 *  backlight, faint scanlines, a play button and a scrubber — enough to
 *  read "there's a film in here" from across the frame. Aspect matches
 *  the screen plane (0.56 x 0.38 body radii). */
export function createVideoScreenTexture(): THREE.CanvasTexture {
  const w = 256;
  const h = 176;
  const canvas = createCanvas(w, h);
  const ctx = canvas.getContext("2d");
  if (!ctx) return asTexture(canvas);

  const glass = ctx.createLinearGradient(0, 0, w, h);
  glass.addColorStop(0, "#161b33");
  glass.addColorStop(1, "#070914");
  ctx.fillStyle = glass;
  ctx.fillRect(0, 0, w, h);

  const backlight = ctx.createRadialGradient(
    w / 2,
    h / 2,
    0,
    w / 2,
    h / 2,
    w * 0.55,
  );
  backlight.addColorStop(0, "rgba(158, 128, 249, 0.6)");
  backlight.addColorStop(1, "rgba(158, 128, 249, 0)");
  ctx.fillStyle = backlight;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
  for (let y = 0; y < h; y += 4) ctx.fillRect(0, y, w, 1);

  // Play button
  const cx = w / 2;
  const cy = h / 2 - 8;
  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.arc(cx, cy, 36, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.moveTo(cx - 12, cy - 19);
  ctx.lineTo(cx + 20, cy);
  ctx.lineTo(cx - 12, cy + 19);
  ctx.closePath();
  ctx.fill();

  // Scrubber, a third of the way in
  const barY = h - 24;
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.fillRect(22, barY, w - 44, 4);
  const played = 22 + (w - 44) * 0.36;
  ctx.fillStyle = "#b9a4ff";
  ctx.fillRect(22, barY, played - 22, 4);
  ctx.beginPath();
  ctx.arc(played, barY + 2, 6, 0, Math.PI * 2);
  ctx.fill();

  // Glass sheen across the top-left
  const sheen = ctx.createLinearGradient(0, 0, w * 0.7, h * 0.7);
  sheen.addColorStop(0, "rgba(255, 255, 255, 0.18)");
  sheen.addColorStop(0.55, "rgba(255, 255, 255, 0)");
  ctx.fillStyle = sheen;
  ctx.fillRect(0, 0, w, h);
  return asTexture(canvas);
}
