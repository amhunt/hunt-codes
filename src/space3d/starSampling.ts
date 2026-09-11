import tinycolor from "tinycolor2";

/**
 * Star data produced by sampling text glyphs on an offscreen 2D canvas.
 * Coordinates are in CSS pixels relative to the viewport.
 * Extracted from Stars.tsx so both the legacy DOM renderer and the WebGL
 * star field share the same layout.
 */
export interface SampledStar {
  x: number;
  y: number;
  r: number;
  color: string;
  /** Index of the glyph this star belongs to within the sampled text */
  letter: number;
}

// Sampling-internal: glyph-canvas coordinates used only for the
// min-distance dedup between candidate points
interface PlacedStar extends SampledStar {
  canvasX: number;
  canvasY: number;
}

/** Where a line of star text sits on screen (CSS px). */
export interface TextStarLayout {
  /** Left edge of the first glyph */
  x: number;
  /** Top of the glyph boxes; the glyphs hang below by ~1.6× the letter
   *  width (the sampled font size) */
  y: number;
  /** Total glyph width, spacing excluded — sets the sampled font size */
  textWidth: number;
  /** Gap between consecutive letters */
  letterSpacing: number;
  /** The sampled font size — the letters' height basis. Defaults to the
   *  average glyph box width (textWidth / letters), which is how the
   *  single-line title and the name header size themselves; the stacked
   *  title sets it explicitly so every line's letters stand the same
   *  height whatever their widths add up to. */
  fontSize?: number;
}

const LANDING_TEXT_TOP_PX = 60;
const fontFamily = "Helvetica Neue";

const MIN_PX_DIFF_BETWEEN_STARS = 3;

const generateStarsForLetter = ({
  letter,
  letterIndex,
  offsetX,
  offsetY,
  letterWidthPx,
  averageLetterWidth,
  density,
  radiusScale,
}: {
  letter: string;
  letterIndex: number;
  offsetX: number;
  offsetY: number;
  letterWidthPx: number;
  averageLetterWidth: number;
  density: number;
  radiusScale: number;
}) => {
  // Number of stars is proportional to the width of the letter (imperfect
  // approximation); density thins it for the muted name header
  const numStars = Math.round(letterWidthPx * density);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Approximation of the height of the letter
  const averageLetterHeight = averageLetterWidth * 1.5;

  canvas.width = letterWidthPx;
  canvas.height = averageLetterWidth * 2;
  const fontSize = averageLetterWidth;
  ctx.font = `900 ${fontSize}px ${fontFamily}`;
  ctx.fillText(letter, 0, averageLetterWidth, letterWidthPx);
  const letterMetricsInCanvas = ctx.measureText(letter);
  const ctxTextWidth = letterMetricsInCanvas.width;
  const ctxTextHeight = letterMetricsInCanvas.fontBoundingBoxAscent;
  const points: PlacedStar[] = [];
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

  for (let i = 0; i < numStars; i++) {
    let foundPoint = false;
    let remainingAttempts = 40;
    while (!foundPoint && remainingAttempts > 0) {
      const xRandom = Math.random();
      const x = Math.floor(xRandom * canvas.width);
      const y = Math.floor(Math.random() * canvas.height);
      const index = (y * canvas.width + x) * 4;

      // If the pixel is not transparent AND is not near an existing star, we've found a point in the letter
      if (
        imageData.data[index + 3] > 0 &&
        !points.some(
          (star) =>
            Math.abs(star.canvasX - x) < MIN_PX_DIFF_BETWEEN_STARS &&
            Math.abs(star.canvasY - y) < MIN_PX_DIFF_BETWEEN_STARS,
        )
      ) {
        points.push({
          // Every glyph fills its box: a narrow one is stretched out to
          // it, and one wider than the box (the fillText maxWidth
          // squeezed it in) is left at the box's width rather than
          // squeezed a second time
          x:
            (x * letterWidthPx) / Math.min(ctxTextWidth, letterWidthPx) +
            offsetX,
          canvasX: x,
          y: (y * averageLetterHeight) / ctxTextHeight + offsetY,
          canvasY: y,
          r: (Math.random() + 1.5) * radiusScale,
          // Color should be a hex value between blue and red, based on the x and y coordinates. Blue in the top-left, red in the bottom-right.
          color: tinycolor
            .mix("#3effcc", "#ff2d2d", xRandom * 100)
            .toHexString(),
          letter: letterIndex,
        });
        foundPoint = true;
      }
      remainingAttempts--;
    }
  }
  return points;
};

const percentageWidthOfText = 0.8;
const percentageWidthOfSpacing = 0.1;
const percentageWidthForSidePadding = 0.05;

// Where a sampled glyph's ink sits inside its box, in font sizes below
// the layout's y: capitals run from GLYPH_INK_TOP to GLYPH_INK_BOTTOM
// (measured off the same canvas draw generateStarsForLetter makes —
// the "." and the ♥ stray a little either way).
const GLYPH_INK_TOP = 0.43;
const GLYPH_INK_BOTTOM = 1.53;

// The measuring font: letter widths are taken at this size and scaled,
// so glyph boxes keep their relative proportions at any size
const MEASURE_PX = 40;
const MEASURE_FONT = `100 ${MEASURE_PX}px ${fontFamily}`;

/** Glyphs the measuring font doesn't have: the ♥ falls back to a face
 *  that sets it a full em wide, which would hand it a box nearly three
 *  letters across — give it a capital's instead */
const MEASURE_OVERRIDES: Record<string, number> = { "♥": 28 };

/** Each letter's width in the measuring font (all 0 without a 2D context) */
function measureLetters(text: string): number[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.split("").map(() => 0);
  ctx.font = MEASURE_FONT;
  return text
    .split("")
    .map(
      (letter) =>
        MEASURE_OVERRIDES[letter] ?? Math.round(ctx.measureText(letter).width),
    );
}

/** The landing title's single-line layout: 80% of the viewport width of
 *  glyphs, 10% of letter spacing, 5% of padding each side. */
const landingTextLayout = (
  text: string,
  windowWidth: number,
): TextStarLayout => ({
  x: percentageWidthForSidePadding * windowWidth,
  y: LANDING_TEXT_TOP_PX,
  textWidth: Math.round(percentageWidthOfText * windowWidth),
  letterSpacing: (windowWidth * percentageWidthOfSpacing) / (text.length - 1),
});

// ─── The stacked title (lg+) ───────────────────
// From LANDING_STACK_MIN_WIDTH_PX up the title stands in a left column on
// two or three lines, vertically centred on the viewport, with the solar
// system off to the right (CameraRig's landing pose parks the sun at
// three quarters of the width). Narrower viewports keep the one-line
// banner across the top.
export const LANDING_STACK_MIN_WIDTH_PX = 1280; // $breakpoint-lg

/** How each phrase breaks into lines when stacked */
const STACKED_LINES: Record<string, string[]> = {
  "HUNT.CODES": ["HUNT.", "CODES"],
  "BUILT WITH ♥": ["BUILT", "WITH ♥"],
  "BY ANDREW HUNT": ["BY", "ANDREW", "HUNT"],
};
/** Letter height (the sampled font size) as a fraction of the viewport
 *  height — the two-line wordmark comes out ~40% of the height tall */
const STACK_FONT_VH = 0.16;
/** The column may reach this far across the viewport before the letters
 *  shrink to fit: short of the sun's ENTER ring, centred at 75% */
const STACK_COLUMN_RIGHT = 0.62;
/** Glyph boxes are this much wider than the measuring font's natural
 *  proportions (the one-line banner runs ~1.7× stretched) */
const STACK_STRETCH = 1.5;
/** Gap between letters and the pitch from one line to the next, in font
 *  sizes (capitals are ~1.1 font sizes tall, so lines sit ~0.28 apart) */
const STACK_LETTER_SPACING = 0.14;
const STACK_LINE_PITCH = 1.38;

export interface LandingLine {
  text: string;
  /** Index of the line's first glyph within the phrase */
  start: number;
  layout: TextStarLayout;
}

export interface LandingTitleLayout {
  /** Whether the title is the stacked column (lg+) or the top banner */
  stacked: boolean;
  lines: LandingLine[];
  /** The sampled font size — the average letter width */
  fontSize: number;
}

const stackedLines = (phrase: string): string[] =>
  STACKED_LINES[phrase] ?? phrase.split(" ");

/** A stacked line's width in font sizes: its glyph boxes plus the gaps */
const lineUnits = (text: string): number =>
  (measureLetters(text).reduce((sum, w) => sum + w, 0) / MEASURE_PX) *
    STACK_STRETCH +
  (text.length - 1) * STACK_LETTER_SPACING;

/** Where the landing title's lines sit for this phrase and viewport. */
export function landingTitleLayout(
  phrase: string,
  width: number,
  height: number,
): LandingTitleLayout {
  if (width < LANDING_STACK_MIN_WIDTH_PX) {
    const layout = landingTextLayout(phrase, width);
    return {
      stacked: false,
      fontSize: layout.textWidth / phrase.length,
      lines: [{ text: phrase, start: 0, layout }],
    };
  }
  const margin = percentageWidthForSidePadding * width;
  // One size for every phrase, so the stars glide between phrases without
  // the title breathing in and out: the widest line of any phrase sets it
  const widest = Math.max(
    ...Object.values(STACKED_LINES).flat().map(lineUnits),
  );
  const fontSize = Math.min(
    STACK_FONT_VH * height,
    (STACK_COLUMN_RIGHT * width - margin) / widest,
  );
  const texts = stackedLines(phrase);
  const pitch = STACK_LINE_PITCH * fontSize;
  const inkHeight =
    (GLYPH_INK_BOTTOM - GLYPH_INK_TOP) * fontSize + (texts.length - 1) * pitch;
  const firstY = (height - inkHeight) / 2 - GLYPH_INK_TOP * fontSize;
  const letterSpacing = STACK_LETTER_SPACING * fontSize;
  let cursor = 0;
  const lines = texts.map((text, i) => {
    const start = Math.max(0, phrase.indexOf(text, cursor));
    cursor = start + text.length;
    return {
      text,
      start,
      layout: {
        x: margin,
        y: firstY + i * pitch,
        textWidth: Math.round(
          (lineUnits(text) - (text.length - 1) * STACK_LETTER_SPACING) *
            fontSize,
        ),
        letterSpacing,
        fontSize,
      },
    };
  });
  return { stacked: true, lines, fontSize };
}

/**
 * The box one glyph of the landing title occupies, in CSS px: the same
 * measure-and-scale generateStarsForText runs, so `left` and `width` are
 * exactly where that glyph's stars land, and `bottom` is where the
 * letters end (GLYPH_INK_BOTTOM). For DOM chrome that wants to sit under
 * a particular letter (the "(and Claude)" caption under BUILT WITH ♥'s
 * heart). `index` counts through the whole phrase, spaces included, so
 * a stacked phrase's later lines are found by their `start`.
 */
export function landingGlyphBox(
  phrase: string,
  index: number,
  windowWidth: number,
  windowHeight: number,
): { left: number; width: number; bottom: number } {
  const { lines, fontSize } = landingTitleLayout(
    phrase,
    windowWidth,
    windowHeight,
  );
  const line =
    lines.find((l) => index >= l.start && index < l.start + l.text.length) ??
    lines[0];
  const { layout, text } = line;
  const bottom = layout.y + GLYPH_INK_BOTTOM * fontSize;
  const letterWidths = measureLetters(text);
  const total = letterWidths.reduce((sum, w) => sum + w, 0);
  if (!total) return { left: layout.x, width: fontSize, bottom };
  const i = index - line.start;
  let left = layout.x;
  for (let k = 0; k < i; k++) {
    left +=
      Math.round((letterWidths[k] / total) * layout.textWidth) +
      layout.letterSpacing;
  }
  return {
    left,
    width: Math.round((letterWidths[i] / total) * layout.textWidth),
    bottom,
  };
}

/**
 * The landing title's ink block — its left edge and the bottom of its
 * last line — for chrome that hangs under the whole title (the tagline
 * under the stacked wordmark, LandingTagline.tsx).
 */
export function landingTitleBox(
  phrase: string,
  windowWidth: number,
  windowHeight: number,
): { left: number; bottom: number; stacked: boolean } {
  const { lines, fontSize, stacked } = landingTitleLayout(
    phrase,
    windowWidth,
    windowHeight,
  );
  const last = lines[lines.length - 1];
  return {
    left: last.layout.x,
    bottom: last.layout.y + GLYPH_INK_BOTTOM * fontSize,
    stacked,
  };
}

export interface TextStarOptions {
  /** Stars per px of letter width (1 = the landing title's full density) */
  density?: number;
  /** Multiplier on the 1.5–2.5px star radius, for small glyphs */
  radiusScale?: number;
  /** Added to every star's glyph index — a stacked title samples one
   *  line at a time, and each line's glyphs count on from the last */
  letterOffset?: number;
}

/** Sample a line of text into stars at the given layout. */
export const generateStarsForText = (
  text: string,
  layout: TextStarLayout,
  { density = 1, radiusScale = 1, letterOffset = 0 }: TextStarOptions = {},
): SampledStar[] => {
  const letterWidths = measureLetters(text);
  const totalPrescaledCharWidths = letterWidths.reduce((sum, w) => sum + w, 0);
  if (!totalPrescaledCharWidths) return [];

  const totalStarsWidthPx = layout.textWidth;
  const averageLetterWidth = layout.fontSize ?? totalStarsWidthPx / text.length;
  const scaledLetterWidths = letterWidths.map((letterWidthPx) =>
    Math.round((letterWidthPx / totalPrescaledCharWidths) * totalStarsWidthPx),
  );

  // Generate stars for each letter, taking into account the actual width of previous letters
  let currentX = layout.x;
  return text.split("").flatMap((letter, index) => {
    const stars = generateStarsForLetter({
      letter,
      letterIndex: index + letterOffset,
      offsetX: currentX,
      offsetY: layout.y,
      letterWidthPx: scaledLetterWidths[index],
      averageLetterWidth,
      density,
      radiusScale,
    });
    // Move currentX by the width of this letter plus spacing
    currentX += scaledLetterWidths[index] + layout.letterSpacing;
    return stars;
  });
};

/** The landing title ("HUNT.CODES" and the phrases that follow it), one
 *  line across the top or, on lg+, stacked in the left column. */
export const generateStarsForLetters = (
  phrase: string,
  windowWidth: number,
  windowHeight: number,
): SampledStar[] =>
  landingTitleLayout(phrase, windowWidth, windowHeight).lines.flatMap((line) =>
    generateStarsForText(line.text, line.layout, {
      letterOffset: line.start,
    }),
  );

export const starPhrases = ["HUNT.CODES", "BUILT WITH ♥", "BY ANDREW HUNT"];
export const starPhrasesSmall = ["ANDREW", "HUNT", "CODES ★"];

/**
 * Where a landing text star starts before it flies in: a point in the
 * band just outside the viewport, uniform over the whole band, so the
 * stars converge on the title from every side — top, bottom, left and
 * right alike — rather than scattering around the glyphs. The band is
 * INTRO_SPAWN_BAND of the longer viewport edge deep. Rejection-sampled
 * from the enclosing rectangle; the band is two thirds of it, so this
 * rarely loops more than once.
 */
export const INTRO_SPAWN_BAND = 0.3;
export function introSpawnPoint(
  width: number,
  height: number,
): { x: number; y: number } {
  const band = Math.max(width, height) * INTRO_SPAWN_BAND;
  for (;;) {
    const x = -band + Math.random() * (width + 2 * band);
    const y = -band + Math.random() * (height + 2 * band);
    if (x < 0 || x > width || y < 0 || y > height) return { x, y };
  }
}

/**
 * A spawn point for every target glyph star, chosen so the fly-in
 * doesn't tangle: the spawns are still uniform around the band, but
 * instead of handing them out in index order (which sent stars criss-
 * crossing the whole screen) both sets are sorted by angle around the
 * title's centre and matched rank for rank. The mapping is monotonic in
 * angle, so each star heads inward along roughly its own ray and paths
 * rarely cross — a cheap stand-in for a real assignment problem, two
 * sorts instead of anything quadratic. Returns xy pairs indexed like
 * `targets`.
 */
export function introSpawnPositions(
  targets: { x: number; y: number }[],
  width: number,
  height: number,
): Float32Array {
  const n = targets.length;
  const out = new Float32Array(n * 2);
  if (n === 0) return out;
  let cx = 0;
  let cy = 0;
  for (const t of targets) {
    cx += t.x;
    cy += t.y;
  }
  cx /= n;
  cy /= n;
  const angleOf = (p: { x: number; y: number }) =>
    Math.atan2(p.y - cy, p.x - cx);
  const spawns = Array.from({ length: n }, () =>
    introSpawnPoint(width, height),
  );
  spawns.sort((a, b) => angleOf(a) - angleOf(b));
  const order = targets
    .map((_, i) => i)
    .sort((a, b) => angleOf(targets[a]) - angleOf(targets[b]));
  order.forEach((targetIndex, rank) => {
    out[targetIndex * 2] = spawns[rank].x;
    out[targetIndex * 2 + 1] = spawns[rank].y;
  });
  return out;
}

// Background star densities: ~1-2 stars per ten thousand pixels
const BACKGROUND_DENSITY_LANDING = 0.0002;
const BACKGROUND_DENSITY_DEFAULT = 0.0001;

export interface BackgroundStar {
  x: number;
  y: number;
  /** Legacy DOM size: the star div's width in px (visual radius is half) */
  widthPx: number;
  color: string;
}

/**
 * Random background sky, shared by both renderers so density and palette
 * stay identical between the WebGL and DOM paths.
 */
export const generateBackgroundStars = (
  width: number,
  height: number,
  isLanding: boolean,
): BackgroundStar[] => {
  const count = Math.round(
    width *
      height *
      (isLanding ? BACKGROUND_DENSITY_LANDING : BACKGROUND_DENSITY_DEFAULT),
  );
  return Array.from({ length: count }, () => ({
    x: Math.random() * width,
    y: Math.random() * height,
    widthPx: Math.random() + 1,
    color: tinycolor.random().brighten(20).toHexString(),
  }));
};
