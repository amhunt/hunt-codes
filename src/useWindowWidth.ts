import { useEffect, useState } from "react";
import { useDebouncedCallback } from "use-debounce";

export default function useWindowWidth() {
  const [width, setWidth] = useState(window.innerWidth);
  const [height, setHeight] = useState(window.innerHeight);

  const debouncedSetWidth = useDebouncedCallback(
    (width: number, height: number) => {
      setWidth(width);
      setHeight(height);
    },
    100
  ); // Debounce window resizing to 100ms

  useEffect(() => {
    const handleResize = () => {
      debouncedSetWidth(window.innerWidth, window.innerHeight);
    };

    // Use passive event listener for better scroll performance
    window.addEventListener("resize", handleResize, { passive: true });
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, [debouncedSetWidth]);

  return { width, height };
}
