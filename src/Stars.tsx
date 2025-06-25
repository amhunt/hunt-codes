import React, {
  useMemo,
  memo,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import useWindowWidth from "useWindowWidth";
import tinycolor from "tinycolor2";
import { useCursorPosition } from "hooks/useCursorPosition";
import StarDot, { type StarT } from "stars/StarDot";
import { DEFAULT_CURSOR_GRAVITY_RADIUS_PX } from "stars/starUtils";
import { useDebounce } from "use-debounce";
import usePageVisibilityState from "usePageVisibilityState";

const offsetY = 60;
// const fontFamily = "Arial";
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
  const points: StarT[] = [];
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
            Math.abs(star.canvasY - y) < MIN_PX_DIFF_BETWEEN_STARS
        )
      ) {
        points.push({
          x: (x * letterWidthPx) / ctxTextWidth + offsetX,
          canvasX: x,
          y: (y * averageLetterHeight) / ctxTextHeight + offsetY,
          canvasY: y,
          r: Math.random() + 1.5,
          // animationDelay: `${Math.random() * 3000}ms`,
          isText: true,
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

const generateStarsForLetters = (text: string, windowWidth: number) => {
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
    Math.round((letterWidthPx / totalPrescaledCharWidths) * totalStarsWidthPx)
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

const starPhrases = ["HUNT.CODES", "BUILT WITH ♥", "BY ANDREW HUNT"];
const starPhrasesSmall = ["ANDREW", "HUNT", "CODES ★"];

const cursorDisabledBufferZonePx = 20;

const STAR_MOVEMENT_SPEED_MULTIPLIER = 1 / 100;

const useStars = (
  isLanding: boolean,
  cursorGravityRadiusPx: number
): StarT[] => {
  const pageVisibilityState = usePageVisibilityState();
  const { width, height, isSmall } = useWindowWidth();
  const cursorPos = useCursorPosition(32);
  const cursorPositionRef = useRef(cursorPos);
  useEffect(() => {
    cursorPositionRef.current = cursorPos;
  }, [cursorPos]);
  const [currTextIndex, setCurrTextIndex] = useState(0);

  const textOptionsToUse = isSmall ? starPhrasesSmall : starPhrases;

  const initialTextStars = useMemo(() => {
    return [
      ...(isLanding
        ? generateStarsForLetters(textOptionsToUse[currTextIndex], width)
        : []),
    ];
  }, [isLanding, textOptionsToUse, currTextIndex, width]);

  const [initialTextStarsState, setInitialTextStarsState] =
    useState(initialTextStars);
  const [textStarsState, setTextStarsState] = useState(() =>
    initialTextStarsState.map((star) => ({
      ...star,
      x: star.x + Math.random() * 400 - 200,
      y: star.y + Math.random() * 400 - 200,
    }))
  );

  useEffect(() => {
    setInitialTextStarsState(initialTextStars);
  }, [initialTextStars]);

  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsAnimationEnabled(true), 3000);

    if (!isAnimationEnabled || pageVisibilityState === "hidden") return;

    let currentIndex = 0;
    const interval = setInterval(() => {
      if (currentIndex < textOptionsToUse.length) {
        currentIndex++;
        setCurrTextIndex(currentIndex % textOptionsToUse.length);
      } else {
        clearInterval(interval);
      }
    }, TEXT_CHANGE_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [isAnimationEnabled, textOptionsToUse.length, pageVisibilityState]);

  // 1 background star per thousand pixels
  const numBackgroundStars = Math.round(
    width * height * (isLanding ? 0.0002 : 0.0001)
  );

  const backgroundStars = useMemo(() => {
    // Add some random stars in the background
    return Array.from({ length: numBackgroundStars }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        canvasX: x,
        canvasY: y,
        r: Math.random() + 1,
        // animationDelay: `${Math.random() * 4000}ms`,
        isText: false,
        color: tinycolor.random().brighten(20).toHexString(),
      };
    });
  }, [width, height, isLanding]);

  const numTextStars = textStarsState.length;

  const randomVelocities = useMemo(() => {
    return Array.from({ length: numTextStars }, () => Math.random() + 0.5);
  }, [numTextStars]);

  const ANIMATION_INTERVAL_MS = 45;
  const TEXT_CHANGE_INTERVAL_MS = 10000;

  const updateStarPositions = useCallback(
    (prevStars: StarT[]) => {
      const startingArr =
        prevStars.length > initialTextStarsState.length
          ? prevStars.slice(0, initialTextStarsState.length)
          : [...prevStars, ...initialTextStarsState.slice(prevStars.length)];

      // Each star within a 100px radius of the cursor moves towards the cursor
      // if they are outside a 100px radius of the cursor, they move back towards their original position
      return startingArr.map((star, starIdx) => {
        const cursorX =
          cursorPositionRef.current?.x ?? Number.POSITIVE_INFINITY;
        const cursorY =
          cursorPositionRef.current?.y ?? Number.POSITIVE_INFINITY;

        const distanceToCursor = Math.sqrt(
          (star.x - cursorX) ** 2 + (star.y - cursorY) ** 2
        );
        const isCloseToCursor =
          distanceToCursor < cursorGravityRadiusPx &&
          !isSmall &&
          // ensure cursor is at least 20px from edge of viewport,
          // to prevent the cursor being logged as on the edge of the screen after leaving the screen
          cursorX > cursorDisabledBufferZonePx &&
          cursorX < window.innerWidth - cursorDisabledBufferZonePx &&
          cursorY > cursorDisabledBufferZonePx &&
          cursorY < window.innerHeight - cursorDisabledBufferZonePx;
        const originalX = initialTextStarsState[starIdx]?.x ?? star.x;
        const originalY = initialTextStarsState[starIdx]?.y ?? star.y;

        const xDistanceToOriginal = (star.x - originalX) ** 2;
        const yDistanceToOriginal = (star.y - originalY) ** 2;

        const closeToCustomUncappedRandomChange = isCloseToCursor
          ? // distance to cursor is capped at 100px
            10000 / Math.pow(Math.max(distanceToCursor, 10), 2)
          : undefined;

        const uncappedRandomChangeX =
          randomVelocities[starIdx] *
          (closeToCustomUncappedRandomChange ??
            xDistanceToOriginal * STAR_MOVEMENT_SPEED_MULTIPLIER);
        const randomChangeX = Math.max(1, Math.min(10, uncappedRandomChangeX));
        const uncappedRandomChangeY =
          randomVelocities[starIdx] *
          (closeToCustomUncappedRandomChange ??
            yDistanceToOriginal * STAR_MOVEMENT_SPEED_MULTIPLIER);
        const randomChangeY = Math.max(1, Math.min(10, uncappedRandomChangeY));
        let newX = star.x;
        let newY = star.y;
        if (isCloseToCursor) {
          const xMovement = Math.min(randomChangeX, Math.abs(star.x - cursorX));
          const yMovement = Math.min(randomChangeY, Math.abs(star.y - cursorY));
          newX = star.x - (star.x - cursorX > 0 ? xMovement : -xMovement);
          newY = star.y - (star.y - cursorY > 0 ? yMovement : -yMovement);
        } else {
          // move back towards their original (text) position
          if (newX - originalX > 0) {
            const xMovement = Math.min(newX - originalX, randomChangeX);
            newX = newX - xMovement;
          } else if (newX - originalX < 0) {
            const xMovement = Math.min(originalX - newX, randomChangeX);
            newX = newX + xMovement;
          }
          if (newY - originalY > 0) {
            const yMovement = Math.min(newY - originalY, randomChangeY);
            newY = newY - yMovement;
          } else if (newY - originalY < 0) {
            const yMovement = Math.min(originalY - newY, randomChangeY);
            newY = newY + yMovement;
          }
        }
        return { ...star, x: newX, y: newY, distanceToCursor } satisfies StarT;
      });
    },
    [
      cursorPositionRef,
      initialTextStarsState,
      isSmall,
      randomVelocities,
      cursorGravityRadiusPx,
    ]
  );

  useEffect(() => {
    if (!isAnimationEnabled || pageVisibilityState === "hidden") return;
    const interval = setInterval(() => {
      setTextStarsState(updateStarPositions);
    }, ANIMATION_INTERVAL_MS);
    return () => clearInterval(interval);
  }, [isAnimationEnabled, updateStarPositions, pageVisibilityState]);

  const allStars = useMemo(() => {
    return [...textStarsState, ...backgroundStars];
  }, [textStarsState, backgroundStars]);
  return allStars;
};

function Stars({ isLanding }: { isLanding: boolean }) {
  const [cursorGravityRadiusPx, setCursorGravityRadiusPx] = useState(
    DEFAULT_CURSOR_GRAVITY_RADIUS_PX
  );
  const [debouncedCursorGravityRadiusPx] = useDebounce(
    cursorGravityRadiusPx,
    500
  );
  const stars = useStars(isLanding, debouncedCursorGravityRadiusPx);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setHasMounted(true), 500);
    return () => clearTimeout(timeout);
  }, []);

  const textStars = useMemo(() => stars.filter((s) => s.isText), [stars]);
  const backgroundStars = useMemo(
    () => stars.filter((s) => !s.isText),
    [stars]
  );

  const numCloseToCursor = useMemo(() => {
    return textStars.filter(
      (s) =>
        s.distanceToCursor != null && s.distanceToCursor < cursorGravityRadiusPx
    ).length;
  }, [textStars]);

  return (
    <>
      <div
        className="stars-container"
        style={{ filter: hasMounted ? "blur(0)" : "blur(5px)" }}
      >
        {backgroundStars.map((star, starIdx) => (
          <StarDot key={starIdx} star={star} as="div" />
        ))}
      </div>
      <svg
        className="stars-container"
        height="100%"
        width="100%"
        style={{ filter: hasMounted ? "blur(0)" : "blur(5px)" }}
      >
        {textStars.map((star, starIdx) => (
          <StarDot
            key={starIdx}
            star={star}
            numCloseToCursor={numCloseToCursor}
          />
        ))}
      </svg>
      {/* Slider that controls the cursor gravity radius */}
      {/* <div className="slider-container">
        <label htmlFor="cursor-gravity-slider" className="slider-label">
          Cursor Gravity Radius: {cursorGravityRadiusPx}px
        </label>
        <input
          id="cursor-gravity-slider"
          type="range"
          min={100}
          max={1000}
          onChange={(e) => setCursorGravityRadiusPx(parseInt(e.target.value))}
          value={cursorGravityRadiusPx.toString()}
          className="slider-input"
        />
      </div> */}
    </>
  );
}

export default memo(Stars);
