import React, { useMemo, memo, useEffect, useState, useRef } from "react";
import cx from "classnames";
import "./App.scss";
import "./computer.scss";

import useWindowWidth from "useWindowWidth";
import tinycolor from "tinycolor2";
import { useCursorPosition } from "hooks/useCursorPosition";

interface Star {
  x: number;
  y: number;
  r: number;
  canvasX: number;
  canvasY: number;
  animationDelay: string;
  isText?: boolean;
  transitionDuration?: string;
  color: string;
}

const offsetY = 60;
const fontFamily = "Arial";

const generateStarsForLetter = ({
  letter,
  offsetX,
  letterWidth,
  averageLetterWidth,
}: {
  letter: string;
  offsetX: number;
  letterWidth: number;
  averageLetterWidth: number;
}) => {
  // Number of stars is proportional to the width of the letter (imperfect approximation)
  const numStars = letterWidth / 1.5;
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) return [];

  const averageLetterHeight = averageLetterWidth * 1.5;

  canvas.width = letterWidth;
  canvas.height = averageLetterWidth * 2;
  const fontSize = averageLetterWidth;
  ctx.font = `100 ${fontSize}px ${fontFamily}`;
  ctx.fillText(letter, 0, averageLetterWidth, letterWidth);
  const letterMetricsInCanvas = ctx.measureText(letter);
  const ctxTextWidth = letterMetricsInCanvas.width;
  const ctxTextHeight = letterMetricsInCanvas.fontBoundingBoxAscent;
  const points: Star[] = [];
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
            Math.abs(star.canvasX - x) < 2 && Math.abs(star.canvasY - y) < 2
        )
      ) {
        points.push({
          x: (x * letterWidth) / ctxTextWidth + offsetX,
          canvasX: x,
          y: (y * averageLetterHeight) / ctxTextHeight + offsetY,
          canvasY: y,
          r: Math.random() + 1.5,
          animationDelay: `${Math.random() * 4000}ms`,
          isText: true,
          // Color should be a hex value between blue and red, based on the x and y coordinates. Blue in the top-left, red in the bottom-right.
          color: tinycolor
            .mix("#3effcc", "#ff2d2d", xRandom * 100)
            .toHexString(),
        });
        console.log("remaining attempts", remainingAttempts);
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
  const scaledLetterWidths = letterWidths.map((letterWidth) =>
    Math.round((letterWidth / totalPrescaledCharWidths) * totalStarsWidthPx)
  );

  // Calculate starting X position to center the text
  const startX = percentageWidthForSidePadding * windowWidth;

  // Generate stars for each letter, taking into account the actual width of previous letters
  let currentX = startX;
  return text.split("").flatMap((letter, index) => {
    const stars = generateStarsForLetter({
      letter,
      offsetX: currentX,
      letterWidth: scaledLetterWidths[index],
      averageLetterWidth,
    });
    // Move currentX by the width of this letter plus spacing
    currentX += scaledLetterWidths[index] + letterSpacing;
    return stars;
  });
};

const useStars = (isLanding: boolean) => {
  const { width, height } = useWindowWidth();
  const { cursorX, cursorY } = useCursorPosition();
  const cursorPositionRef = useRef({ x: cursorX, y: cursorY });
  useEffect(() => {
    cursorPositionRef.current = { x: cursorX, y: cursorY };
  }, [cursorX, cursorY]);
  const initialTextStars = useMemo(
    () => [...(isLanding ? generateStarsForLetters("HUNT CODES", width) : [])],
    [isLanding, width, height]
  );
  const [initialTextStarsState, setInitialTextStarsState] =
    useState(initialTextStars);
  const [textStarsState, setTextStarsState] = useState(initialTextStarsState);

  useEffect(() => {
    setInitialTextStarsState(initialTextStars);
  }, [initialTextStars]);

  const backgroundStars = useMemo<Star[]>(() => {
    // Add some random stars in the background
    return Array.from({ length: isLanding ? 100 : 300 }, () => {
      const x = Math.random() * width;
      const y = Math.random() * height;
      return {
        x,
        y,
        canvasX: x,
        canvasY: y,
        r: Math.random() + 1,
        animationDelay: `${Math.random() * 4000}ms`,
        isText: false,
        color: tinycolor.random().toHexString(),
      };
    });
  }, [width, height, isLanding]);

  // Animate text stars, such that they slowly move towards the cursor if they're close to it
  useEffect(() => {
    // if on a mobile device, don't animate
    if (window.innerWidth < 768) return;

    const interval = setInterval(() => {
      setTextStarsState((prevStars) => {
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
          const isCloseToCursor = distanceToCursor < 100;
          const originalX = initialTextStarsState[starIdx]?.x ?? star.x;
          const originalY = initialTextStarsState[starIdx]?.y ?? star.y;
          const randomChange =
            (Math.random() + 0.5) *
            Math.max(
              2,
              Math.min(40, Math.random() * (100 / distanceToCursor / 4))
            );
          let newX = star.x;
          let newY = star.y;
          if (isCloseToCursor) {
            newX =
              star.x - (star.x - cursorX > 0 ? randomChange : -randomChange);
            newY =
              star.y - (star.y - cursorY > 0 ? randomChange : -randomChange);
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
          return {
            ...star,
            x: newX,
            y: newY,
          };
        });
      });
    }, 30);
    // console.log("interval set");
    return () => clearInterval(interval);
  }, [cursorPositionRef, initialTextStarsState]);

  const allStars = useMemo(() => {
    return [...textStarsState, ...backgroundStars];
  }, [textStarsState, backgroundStars]);
  return allStars;
};

const Stars = ({ isLanding }: { isLanding: boolean }) => {
  const stars = useStars(isLanding);

  return (
    <>
      {stars.map((star, i) => (
        <div
          key={i}
          className={cx(
            "star",
            star.isText ? "star_text" : "star_background",
            !star.isText && star.r < 1.05 && "star_disco"
          )}
          style={{
            left: star.x,
            top: star.y,
            width: star.r,
            height: star.r,
            animationDelay: star.animationDelay,
            backgroundColor: star.color,
            boxShadow: `0px 0px 4px ${star.color}`,
            transitionDuration: star.transitionDuration,
          }}
        />
      ))}
    </>
  );
};

export default memo(Stars);
