import tinycolor from "tinycolor2";

import {
  LANDING_SUN_RADIUS_FRACTION,
  LANDING_SUN_Y_SMALL,
} from "../landingScene";

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
  /** Relative glyph widths, one per letter, that textWidth is divided
   *  by; measured in the measuring font when absent. The stacked title
   *  supplies its own (stackedLetterWidths). */
  letterWidths?: number[];
}

const LANDING_TEXT_TOP_PX = 60;
const fontFamily = "Helvetica Neue";

/** Alpha above which a rasterized pixel counts as ink — high enough to
 *  keep stars off the antialiased fringe of a glyph or a path */
const INK_ALPHA = 128;
/** The ink is diced into cells this big and each takes one star at most,
 *  so the scatter can't clump. Small enough that it doesn't thin out the
 *  name header's little glyphs, which ask for more stars than a letter
 *  that size has room for. */
const STAR_CELL_PX = 3;
/** How many times to look for a free cell before giving that star up */
const STAR_PLACEMENT_ATTEMPTS = 40;
/** The ramp every sampled star is coloured off: mint at the left edge of
 *  the shape through red at the right */
const starColor = (fraction: number) =>
  tinycolor.mix("#3effcc", "#ff2d2d", fraction * 100).toHexString();
/** Stars run 1.5–2.5px, thinner where a caller asks for it */
const starRadius = (scale = 1) => (Math.random() + 1.5) * scale;

/**
 * Well-spread points over whatever has been drawn on `ctx`: up to `count`
 * of them, no two in the same cell. Canvas pixel coordinates — mapping
 * them onto the screen is the caller's business, since a glyph stretches
 * into its box while the signature only shifts. Shared by both samplers,
 * so the title and the signature scatter alike.
 */
const scatterOverInk = (
  ctx: CanvasRenderingContext2D,
  count: number,
): { x: number; y: number }[] => {
  const { width, height } = ctx.canvas;
  const { data } = ctx.getImageData(0, 0, width, height);
  const ink: number[] = [];
  for (let pixel = 0; pixel < width * height; pixel++) {
    if (data[pixel * 4 + 3] > INK_ALPHA) ink.push(pixel);
  }
  if (ink.length === 0) return [];

  const columns = Math.ceil(width / STAR_CELL_PX);
  const taken = new Set<number>();
  const points: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    for (let attempt = 0; attempt < STAR_PLACEMENT_ATTEMPTS; attempt++) {
      const pixel = ink[Math.floor(Math.random() * ink.length)];
      const x = pixel % width;
      const y = Math.floor(pixel / width);
      const cell =
        Math.floor(y / STAR_CELL_PX) * columns + Math.floor(x / STAR_CELL_PX);
      if (taken.has(cell)) continue;
      taken.add(cell);
      points.push({ x, y });
      break;
    }
  }
  return points;
};

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

  return scatterOverInk(ctx, numStars).map(({ x, y }) => ({
    // Every glyph fills its box: a narrow one is stretched out to it, and
    // one wider than the box (the fillText maxWidth squeezed it in) is
    // left at the box's width rather than squeezed a second time
    x: (x * letterWidthPx) / Math.min(ctxTextWidth, letterWidthPx) + offsetX,
    y: (y * averageLetterHeight) / ctxTextHeight + offsetY,
    r: starRadius(radiusScale),
    color: starColor(x / canvas.width),
    letter: letterIndex,
  }));
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

/** Each letter's width in the measuring font (all 0 without a 2D context) */
function measureLetters(text: string): number[] {
  const ctx = document.createElement("canvas").getContext("2d");
  if (!ctx) return text.split("").map(() => 0);
  ctx.font = MEASURE_FONT;
  return text
    .split("")
    .map((letter) => Math.round(ctx.measureText(letter).width));
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

// ─── The stacked title (md+) ───────────────────
// From LANDING_STACK_MIN_WIDTH_PX up the title stands in a left column on
// two or three lines, vertically centred on the viewport, with the solar
// system off to the right (CameraRig's landing pose parks the sun at
// three quarters of the width). Phones keep the one-line banner across
// the top.
export const LANDING_STACK_MIN_WIDTH_PX = 768; // $breakpoint-sm

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

/**
 * The ♥'s measured width for the stacked title. The measuring font has
 * no heart, and the fallback face's is a full em (MEASURE_PX) — but the
 * sampler stretches every glyph ~1.5× taller than its em while a box
 * STACK_STRETCH wide only stretches the heart ~1.5× wider than its em
 * once its side bearings are taken out, and a heart drawn ~1.36 font
 * sizes tall needs a box ~1.66 wide to come out round (capitals get
 * away with reading tall; a narrow heart just reads squashed).
 */
const STACK_HEART_WIDTH = 44;

/** The measuring font's widths, with the ♥ opened out (STACK_HEART_WIDTH) */
const stackedLetterWidths = (text: string): number[] =>
  measureLetters(text).map((w, i) => (text[i] === "♥" ? STACK_HEART_WIDTH : w));

/** A stacked line's width in font sizes: its glyph boxes plus the gaps */
const lineUnits = (text: string): number =>
  (stackedLetterWidths(text).reduce((sum, w) => sum + w, 0) / MEASURE_PX) *
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
        letterWidths: stackedLetterWidths(text),
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
  const letterWidths = layout.letterWidths ?? measureLetters(text);
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
  const letterWidths = layout.letterWidths ?? measureLetters(text);
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

// ─── The signature "A" (phones) ────────────────────────────────────
// Below LANDING_STACK_MIN_WIDTH_PX the title doesn't spell anything: the
// stars fill Andrew's signature A instead of a line of letters. The path
// is public/signature-a-thin.svg's — the thin-stroke cut of the mark,
// which reads better as a scatter of stars than the coin's heavier
// signature-a.svg (that one stays as it is: the favicon, the badge
// extrusion and the coin's confetti all draw from it). Inlined so the
// sampling stays synchronous — re-copy the `d` if the art changes.
const SIGNATURE_PATH =
  "M7.35,192.27l-1.2-.38-1.14-.53-1.06-.68-.97-.82-.85-.93-.69-.97-.32-.57-.53-1.2-.35-1.21-.2-1.28-.04-1.02.14-1.34.33-1.36.46-1.18.53-1.01,29.43-48.25-19.25-14.28-.88-1.19-.54-.96-.23-.54-.37-1.17-.21-1.19-.06-.92.1-1.3.26-1.19.69-1.71.58-.95.74-.93.85-.81.87-.65.53-.31,1.1-.51,1.06-.35.59-.12,1.24-.13,30.76-.02L107.18,4.48l.76-1.02.88-.91.99-.79,1.08-.66,1.11-.49.78-.25,1.31-.26,1.01-.09,1.24.06.82.12,1.03.26.79.29.91.43,1.28.82,1.28,1.16.51.6.58.84.7,1.37.35.97.2.79.16,1.07.04.72,2.01,90.8h29.54l9.96,8.34-9.3,9.59h-29.8l1.06,48-.08,1.4-.11.64-.35,1.29-.5,1.18-.59,1.03-.4.55-.81.93-.5.46-.96.74-.58.36-1.19.57-1.14.39-.65.14-1.26.16-.47.02-1.49-.12-1.19-.24-.63-.2-1.16-.49-67.24-35.2-20.73,31.01,17.61-6.88,12.81,1.21-2.25,13.37-45.65,13.99-1.63-.28ZM57.12,123.65l51.67,27.11-.72-32.51h-47.65l-3.3,5.41ZM71.36,100.31h36.31l-1.27-57.45-35.04,57.45Z";
const SIGNATURE_VIEWBOX = { width: 166.5, height: 192.55 };
/** How tall the letter stands, and the caps that keep it on screen on
 *  narrow or landscape phones (the band below is the room it has) */
const SIGNATURE_HEIGHT_PX = 260;
const SIGNATURE_MAX_WIDTH_FRACTION = 0.75;
const SIGNATURE_MAX_BAND_FRACTION = 0.75;
/** The room above the sun: the top of the viewport down to the top of
 *  the sun's sphere, both of them the landing scene's own numbers. The
 *  letter stands centred in it. */
const SIGNATURE_BAND_FRACTION =
  LANDING_SUN_Y_SMALL - LANDING_SUN_RADIUS_FRACTION;
const SIGNATURE_CENTER_Y_FRACTION = SIGNATURE_BAND_FRACTION / 2;
/** Stars per px of letter height (~415 at the full 260px) */
const SIGNATURE_STAR_DENSITY = 1.6;

/**
 * The stroke Andrew's pen takes through the A, in viewBox units: the
 * order the ball of light draws it in on phones. Measured off the art's
 * own outline, one point per change of direction.
 */
const SIGNATURE_STROKE: [number, number][] = [
  [56, 171], // the tail's free end, the little point at bottom left
  [6, 186], // down and left, to the foot of the tail
  [116, 6], // up and right — the long left diagonal, to the apex
  [120, 170], // down and right — the right leg, to its foot
  [52, 132], // up and left along the strike-through
  [15, 108], // on up to the crossbar's left tip
  [164, 109], // and right, the whole crossbar to its far point
];

/**
 * How fast the pen runs on each leg of SIGNATURE_STROKE, relative to the
 * others (one per leg, so one fewer than there are points). A signature
 * isn't written at one steady rate: the long strokes run away with
 * themselves and the short connecting moves are deliberate. The two legs
 * of the reach back across the letter share a speed — they're one
 * movement of the hand, and a step in pace mid-air would read as a
 * stumble.
 */
const SIGNATURE_LEG_SPEED = [1.1, 1.35, 1.15, 0.85, 0.85, 1.3];

/** How sharp a turn has to be before the pen slows for it at all, and
 *  where it brakes to a full stop (radians) */
const SIGNATURE_TURN_FREE = 0.44; // ~25°: carry straight on through
const SIGNATURE_TURN_STOP = 1.75; // ~100°: come to a halt and set off again
/** The speed the pen carries through a corner it doesn't brake for, as a
 *  multiple of that leg's average — a smooth stroke passes its own
 *  midpoint at 1.5× its average, so that's the pace to keep up. */
const SIGNATURE_CARRY_SPEED = 1.5;

/** A point on the pen's path: how far along the stroke it is, how far
 *  through the draw the pen reaches it (both 0–1), and how hard it brakes
 *  there (0 = straight through, 1 = down to a stop) */
interface PenPoint {
  x: number;
  y: number;
  at: number;
  time: number;
  ease: number;
}

export interface SignatureFormation {
  stars: SampledStar[];
  /** Where each star sits along the stroke (0–1), indexed like `stars` */
  order: Float32Array;
  /** The pen's path in CSS px — where the ball of light walks */
  pen: PenPoint[];
}

/** The stroke in CSS px, each corner carrying its 0–1 arc length and the
 *  0–1 moment of the draw the pen arrives there */
const penPath = (
  scale: number,
  offsetX: number,
  offsetY: number,
): PenPoint[] => {
  const points = SIGNATURE_STROKE.map(([x, y]) => ({
    x: offsetX + x * scale,
    y: offsetY + y * scale,
    at: 0,
    time: 0,
    ease: 1,
  }));
  let length = 0;
  let elapsed = 0;
  const lengths = [0];
  const times = [0];
  for (let i = 1; i < points.length; i++) {
    const leg = Math.hypot(
      points[i].x - points[i - 1].x,
      points[i].y - points[i - 1].y,
    );
    length += leg;
    lengths.push(length);
    // A leg takes as long as it is long, divided by how fast the pen
    // runs on it
    elapsed += leg / (SIGNATURE_LEG_SPEED[i - 1] ?? 1);
    times.push(elapsed);
  }
  points.forEach((point, i) => {
    point.at = length > 0 ? lengths[i] / length : 0;
    point.time = elapsed > 0 ? times[i] / elapsed : 0;
    // The two ends of the stroke start and finish at rest; in between,
    // the pen only brakes for a turn worth braking for. The apex and the
    // feet spin it right around, so it stops dead — but where the
    // strike-through bends a few degrees on its way back across the
    // letter it should carry straight on, not hesitate mid-air.
    if (i === 0 || i === points.length - 1) return;
    const inAngle = Math.atan2(
      point.y - points[i - 1].y,
      point.x - points[i - 1].x,
    );
    const outAngle = Math.atan2(
      points[i + 1].y - point.y,
      points[i + 1].x - point.x,
    );
    const delta = outAngle - inAngle;
    const turn = Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    point.ease = Math.min(
      1,
      Math.max(
        0,
        (turn - SIGNATURE_TURN_FREE) /
          (SIGNATURE_TURN_STOP - SIGNATURE_TURN_FREE),
      ),
    );
  });
  return points;
};

/** How far along the stroke the nearest point of the pen's path is */
const strokeOrder = (x: number, y: number, pen: PenPoint[]): number => {
  let nearest = Infinity;
  let order = 0;
  for (let i = 1; i < pen.length; i++) {
    const a = pen[i - 1];
    const b = pen[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const span = dx * dx + dy * dy;
    const t = span
      ? Math.min(1, Math.max(0, ((x - a.x) * dx + (y - a.y) * dy) / span))
      : 0;
    const distance = (x - a.x - t * dx) ** 2 + (y - a.y - t * dy) ** 2;
    // Ties go to the earlier segment: where the strokes cross, a star
    // belongs to the one the pen reaches first
    if (distance < nearest) {
      nearest = distance;
      order = a.at + t * (b.at - a.at);
    }
  }
  return order;
};

/** Where the pen is at a moment of the draw: how far along the stroke it
 *  has come (0–1, which is what says whether a star has been laid down
 *  yet) and where on screen that puts it */
export interface PenState {
  drawn: number;
  x: number;
  y: number;
}

/**
 * The pen at `time` (0–1 of the draw). Each leg runs on a cubic with its
 * end speeds set by how hard the pen brakes at the corners either side
 * (`ease`): through a reversal a real hand's speed passes through zero,
 * and that stop and run-up is most of what separates a signature being
 * written from a marquee — while a joint that barely changes direction is
 * taken at full tilt. A leg is a straight line, so the same eased
 * fraction gives both how much of the stroke is behind the pen and where
 * the pen itself stands.
 */
export function signaturePen(pen: PenPoint[], time: number): PenState {
  if (pen.length === 0) return { drawn: 1, x: 0, y: 0 };
  const at = Math.min(1, Math.max(0, time));
  for (let i = 1; i < pen.length; i++) {
    if (at > pen[i].time && i < pen.length - 1) continue;
    const a = pen[i - 1];
    const b = pen[i];
    const span = b.time - a.time;
    const u = span > 0 ? Math.min(1, (at - a.time) / span) : 1;
    // Hermite on the leg: speed 0 at an end the pen brakes into, full
    // stride at one it carries through. Braking at both ends is a plain
    // smoothstep; carrying through both is a leg taken at a run.
    const from = (1 - a.ease) * SIGNATURE_CARRY_SPEED;
    const to = (1 - b.ease) * SIGNATURE_CARRY_SPEED;
    const eased =
      from * (u ** 3 - 2 * u ** 2 + u) +
      (3 * u ** 2 - 2 * u ** 3) +
      to * (u ** 3 - u ** 2);
    return {
      drawn: a.at + eased * (b.at - a.at),
      x: a.x + eased * (b.x - a.x),
      y: a.y + eased * (b.y - a.y),
    };
  }
  return { drawn: 1, x: pen[0].x, y: pen[0].y };
}

/**
 * The phone landing "title": stars scattered through the fill of the
 * signature A, centred horizontally and a third of the way down. The
 * path is rasterized to an offscreen canvas at its on-screen size, its
 * ink pixels collected, and stars drawn from them at random — the same
 * left-to-right green→red ramp the sampled glyphs use. Each star also
 * carries its place along the pen's stroke, which is what lets the ball
 * of light draw the letter on (StarField's TextStars).
 */
export const generateStarsForSignature = (
  windowWidth: number,
  windowHeight: number,
): SignatureFormation => {
  const empty = { stars: [], order: new Float32Array(0), pen: [] };
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx || typeof Path2D === "undefined") return empty;

  const aspect = SIGNATURE_VIEWBOX.width / SIGNATURE_VIEWBOX.height;
  const height = Math.min(
    SIGNATURE_HEIGHT_PX,
    (SIGNATURE_MAX_WIDTH_FRACTION * windowWidth) / aspect,
    SIGNATURE_MAX_BAND_FRACTION * SIGNATURE_BAND_FRACTION * windowHeight,
  );
  const width = height * aspect;
  canvas.width = Math.round(width);
  canvas.height = Math.round(height);
  const scale = canvas.height / SIGNATURE_VIEWBOX.height;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  // The art is an evenodd path — filled nonzero, the counters fill in
  ctx.fill(new Path2D(SIGNATURE_PATH), "evenodd");

  const offsetX = (windowWidth - width) / 2;
  const offsetY = SIGNATURE_CENTER_Y_FRACTION * windowHeight - height / 2;
  const pen = penPath(scale, offsetX, offsetY);
  const stars: SampledStar[] = scatterOverInk(
    ctx,
    Math.round(height * SIGNATURE_STAR_DENSITY),
  ).map(({ x, y }) => ({
    x: offsetX + x,
    y: offsetY + y,
    r: starRadius(),
    color: starColor(x / canvas.width),
    letter: 0,
  }));
  if (stars.length === 0) return empty;

  const order = new Float32Array(
    stars.map((star) => strokeOrder(star.x, star.y, pen)),
  );
  return { stars, order, pen };
};

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
