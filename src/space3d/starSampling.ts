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
}

// Sampling-internal: glyph-canvas coordinates used only for the
// min-distance dedup between candidate points
interface PlacedStar extends SampledStar {
  canvasX: number;
  canvasY: number;
}

const offsetY = 60;
const fontFamily = "Helvetica Neue";

const MIN_PX_DIFF_BETWEEN_STARS = 3;

const generateStarsForLetter = ({
  letter,
  offsetX,
  letterWidthPx,
  averageLetterWidth,
}: {
  letter: string;
  offsetX: number;
  letterWidthPx: number;
  averageLetterWidth: number;
}) => {
  // Number of stars is proportional to the width of the letter (imperfect approximation)
  const numStars = letterWidthPx;
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
          x: (x * letterWidthPx) / ctxTextWidth + offsetX,
          canvasX: x,
          y: (y * averageLetterHeight) / ctxTextHeight + offsetY,
          canvasY: y,
          r: Math.random() + 1.5,
          // Color should be a hex value between blue and red, based on the x and y coordinates. Blue in the top-left, red in the bottom-right.
          color: tinycolor
            .mix("#3effcc", "#ff2d2d", xRandom * 100)
            .toHexString(),
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

export const generateStarsForLetters = (
  text: string,
  windowWidth: number,
): SampledStar[] => {
  const letterSpacing =
    (windowWidth * percentageWidthOfSpacing) / (text.length - 1);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  // Set the font to match what we use in generateStarsForLetter
  ctx.font = `100 40px ${fontFamily}`;

  // Calculate total width including spacing between letters
  let totalPrescaledCharWidths = 0;
  const letterWidths = text.split("").map((letter) => {
    const width = Math.round(ctx.measureText(letter).width);
    totalPrescaledCharWidths += width;
    return width;
  });

  const totalStarsWidthPx = Math.round(percentageWidthOfText * windowWidth);
  const averageLetterWidth = totalStarsWidthPx / text.length;
  const scaledLetterWidths = letterWidths.map((letterWidthPx) =>
    Math.round((letterWidthPx / totalPrescaledCharWidths) * totalStarsWidthPx),
  );

  // Calculate starting X position to center the text
  const startX = percentageWidthForSidePadding * windowWidth;

  // Generate stars for each letter, taking into account the actual width of previous letters
  let currentX = startX;
  return text.split("").flatMap((letter, index) => {
    const stars = generateStarsForLetter({
      letter,
      offsetX: currentX,
      letterWidthPx: scaledLetterWidths[index],
      averageLetterWidth,
    });
    // Move currentX by the width of this letter plus spacing
    currentX += scaledLetterWidths[index] + letterSpacing;
    return stars;
  });
};

export const starPhrases = ["HUNT.CODES", "BUILT WITH ♥", "BY ANDREW HUNT"];
export const starPhrasesSmall = ["ANDREW", "HUNT", "CODES ★"];

/** Landing text stars start scattered up to this far from their glyph */
export const INTRO_SCATTER_PX = 200;

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
