import React, {
  useMemo,
  memo,
  useEffect,
  useState,
  useRef,
  useCallback,
} from "react";

import useWindowWidth from "useWindowWidth";
import { useCursorPosition } from "hooks/useCursorPosition";
import StarDot, { type StarT } from "stars/StarDot";
import {
  CURSOR_DISABLED_BUFFER_ZONE_PX as cursorDisabledBufferZonePx,
  DEFAULT_CURSOR_GRAVITY_RADIUS_PX,
  STAR_MOVEMENT_SPEED_MULTIPLIER,
  STAR_TICK_MS as ANIMATION_INTERVAL_MS,
  TEXT_CHANGE_INTERVAL_MS,
} from "stars/starUtils";
import { useDebounce } from "use-debounce";
import usePageVisibilityState from "usePageVisibilityState";

// Star generation is shared with the WebGL star field (this component is
// the DOM fallback renderer, used when WebGL isn't available).
import {
  generateBackgroundStars,
  generateStarsForLetters as sampleStarsForLetters,
  starPhrases,
  starPhrasesSmall,
} from "./space3d/starSampling";

const generateStarsForLetters = (text: string, windowWidth: number): StarT[] =>
  sampleStarsForLetters(text, windowWidth).map((star) => ({
    ...star,
    canvasX: star.x,
    canvasY: star.y,
    isText: true,
  }));

const useStars = (
  isLanding: boolean,
  cursorGravityRadiusPx: number,
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
    })),
  );

  useEffect(() => {
    setInitialTextStarsState(initialTextStars);
  }, [initialTextStars]);

  const [isAnimationEnabled, setIsAnimationEnabled] = useState(false);

  useEffect(() => {
    setTimeout(() => setIsAnimationEnabled(true), 2000);

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

  const backgroundStars: StarT[] = useMemo(() => {
    // Random stars in the background (generator shared with the WebGL path)
    return generateBackgroundStars(width, height, isLanding).map((star) => ({
      x: star.x,
      y: star.y,
      canvasX: star.x,
      canvasY: star.y,
      r: star.widthPx,
      isText: false,
      color: star.color,
    }));
  }, [width, height, isLanding]);

  const numTextStars = textStarsState.length;

  const randomVelocities = useMemo(() => {
    return Array.from({ length: numTextStars }, () => Math.random() + 0.5);
  }, [numTextStars]);

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
          (star.x - cursorX) ** 2 + (star.y - cursorY) ** 2,
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
    ],
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
  // setCursorGravityRadiusPx drives the (currently commented-out) dev slider
  // below; kept so the control can be re-enabled without rewiring state.
  // eslint-disable-next-line @typescript-eslint/no-unused-vars, unused-imports/no-unused-vars
  const [cursorGravityRadiusPx, setCursorGravityRadiusPx] = useState(
    DEFAULT_CURSOR_GRAVITY_RADIUS_PX,
  );
  const [debouncedCursorGravityRadiusPx] = useDebounce(
    cursorGravityRadiusPx,
    300,
  );
  const stars = useStars(isLanding, debouncedCursorGravityRadiusPx);
  const [hasMounted, setHasMounted] = useState(false);
  useEffect(() => {
    const timeout = setTimeout(() => setHasMounted(true), 300);
    return () => clearTimeout(timeout);
  }, []);

  const textStars = useMemo(() => stars.filter((s) => s.isText), [stars]);
  const backgroundStars = useMemo(
    () => stars.filter((s) => !s.isText),
    [stars],
  );

  const numCloseToCursor = useMemo(() => {
    return textStars.filter(
      (s) =>
        s.distanceToCursor != null &&
        s.distanceToCursor < cursorGravityRadiusPx,
    ).length;
  }, [textStars]);

  return (
    <>
      <div
        className="stars-container"
        style={{
          filter: hasMounted ? "blur(0)" : "blur(5px)",
          opacity: hasMounted ? 1 : 0,
        }}
      >
        {backgroundStars.map((star, starIdx) => (
          <StarDot key={starIdx} star={star} as="div" />
        ))}
      </div>
      <svg
        className="stars-container"
        height="100%"
        width="100%"
        style={{
          filter: hasMounted ? "blur(0)" : "blur(5px)",
          opacity: hasMounted ? 1 : 0,
        }}
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
