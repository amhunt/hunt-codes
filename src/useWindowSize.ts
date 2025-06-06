import { useCallback, useEffect, useState } from "react";
import { useThrottle } from "./hooks/useDebounce";

export default function useWindowSize() {
  const [size, setSize] = useState<"sm" | "md" | "lg">(
    window.innerWidth < 768 ? "sm" : window.innerWidth < 1000 ? "md" : "lg",
  );

  const updateSize = useCallback(() => {
    if (window.innerWidth < 768) {
      setSize("sm");
    } else if (window.innerWidth < 1000) {
      setSize("md");
    } else {
      setSize("lg");
    }
  }, []);

  const throttledUpdateSize = useThrottle(updateSize, 100);

  useEffect(() => {
    window.addEventListener("resize", throttledUpdateSize, { passive: true });
    return () => {
      window.removeEventListener("resize", throttledUpdateSize);
    };
  }, [throttledUpdateSize]);

  return size;
}
