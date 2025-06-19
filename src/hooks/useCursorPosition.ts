import { useState, useCallback, useEffect } from "react";
import { useThrottledCallback } from "use-debounce";

/**
 * Default throttle to ~60fps
 * @param throttleMs - The number of milliseconds to throttle the cursor position updates
 * @returns The cursor position
 */
export const useCursorPosition = (throttleMs: number = 16) => {
  const [cursorPositionX, setCursorPositionX] = useState(0);
  const [cursorPositionY, setCursorPositionY] = useState(0);

  const throttledCursorUpdate = useThrottledCallback((x: number, y: number) => {
    setCursorPositionX(x);
    setCursorPositionY(y);
  }, throttleMs);

  const getCursorXY = useCallback(
    (e: MouseEvent) => {
      const cursorPositionX = window.Event
        ? e.pageX
        : e.clientX +
          (document?.documentElement?.scrollLeft || document.body.scrollLeft);
      const cursorPositionY = window.Event
        ? e.pageY
        : e.clientY +
          (document?.documentElement?.scrollTop || document.body.scrollTop);

      throttledCursorUpdate(cursorPositionX, cursorPositionY);
    },
    [throttledCursorUpdate]
  );

  useEffect(() => {
    // Use passive event listener for better performance
    document.addEventListener("mousemove", getCursorXY, { passive: true });
    return () => {
      document.removeEventListener("mousemove", getCursorXY);
    };
  }, [getCursorXY]);

  return { cursorX: cursorPositionX, cursorY: cursorPositionY };
};
