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
  console.log("generateStarsForLetters", text, windowWidth);
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

const starPhrases = ["HUNT CODES ♡", "A PERSONAL WEBSITE", "BY ANDREW HUNT"];
const starPhrasesSmall = ["ANDREW", "HUNT", "CODES ★"];

const cursorDisabledBufferZonePx = 20;

const STAR_MOVEMENT_SPEED_MULTIPLIER = 1;

const useStars = (isLanding: boolean): StarT[] => {
  const { width, height } = useWindowWidth();
  const { cursorX, cursorY } = useCursorPosition(32);
  const cursorPositionRef = useRef({ x: cursorX, y: cursorY });
  useEffect(() => {
    cursorPositionRef.current = { x: cursorX, y: cursorY };
  }, [cursorX, cursorY]);
  const [currTextIndex, setCurrTextIndex] = useState(0);

  const isSmall = width < 768;
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

    if (!isAnimationEnabled) return;

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
  }, [isAnimationEnabled, textOptionsToUse.length]);

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
    return Array.from({ length: numTextStars }, () => Math.random());
  }, [numTextStars]);

  const ANIMATION_INTERVAL = 45;
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
        const cursorX = cursorPositionRef.current.x;
        const cursorY = cursorPositionRef.current.y;

        const distanceToCursor = Math.sqrt(
          (star.x - cursorX) ** 2 + (star.y - cursorY) ** 2
        );
        const isCloseToCursor =
          distanceToCursor < 100 &&
          !isSmall &&
          // ensure cursor is at least 20px from edge of viewport,
          // to prevent the cursor being logged as on the edge of the screen after leaving the screen
          cursorX > cursorDisabledBufferZonePx &&
          cursorX < window.innerWidth - cursorDisabledBufferZonePx &&
          cursorY > cursorDisabledBufferZonePx &&
          cursorY < window.innerHeight - cursorDisabledBufferZonePx;
        const originalX = initialTextStarsState[starIdx]?.x ?? star.x;
        const originalY = initialTextStarsState[starIdx]?.y ?? star.y;

        const distanceToOriginal = Math.sqrt(
          (star.x - originalX) ** 2 + (star.y - originalY) ** 2
        );

        const uncappedRandomChange =
          randomVelocities[starIdx] *
          (isCloseToCursor
            ? // distance to cursor is capped at 100px
              10000 / Math.pow(Math.max(distanceToCursor, 10), 2)
            : (distanceToOriginal / 40) * STAR_MOVEMENT_SPEED_MULTIPLIER);
        const randomChange = Math.max(1, Math.min(50, uncappedRandomChange));
        let newX = star.x;
        let newY = star.y;
        if (isCloseToCursor) {
          newX = star.x - (star.x - cursorX > 0 ? randomChange : -randomChange);
          newY = star.y - (star.y - cursorY > 0 ? randomChange : -randomChange);
        } else {
          // move back towards their original position
          if (newX - originalX > 1) {
            newX = newX - randomChange;
          } else if (newX - originalX < -1) {
            newX = newX + randomChange;
          }
          if (newY - originalY > 1) {
            newY = newY - randomChange;
          } else if (newY - originalY < -1) {
            newY = newY + randomChange;
          }
        }
        return { ...star, x: newX, y: newY, distanceToCursor } satisfies StarT;
      });
    },
    [cursorPositionRef, initialTextStarsState, isSmall, randomVelocities]
  );

  useEffect(() => {
    if (!isAnimationEnabled) return;
    const interval = setInterval(() => {
      setTextStarsState(updateStarPositions);
    }, ANIMATION_INTERVAL);
    return () => clearInterval(interval);
  }, [isAnimationEnabled, updateStarPositions]);

  const allStars = useMemo(() => {
    return [...textStarsState, ...backgroundStars];
  }, [textStarsState, backgroundStars]);
  return allStars;
};

function Stars({ isLanding }: { isLanding: boolean }) {
  const stars = useStars(isLanding);
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
        <StarDot key={starIdx} star={star} />
      ))}
      </svg>
    </>
  );
}

export default memo(Stars);
