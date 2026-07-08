import { useEffect, useState } from "react";

export default function usePageVisibilityState() {
  const [visibilityState, setVisibilityState] = useState<"visible" | "hidden">(
    document.visibilityState,
  );

  // this useEffect sets up a listener for visibilitychange events, to update a visibility state value
  useEffect(() => {
    const handleVisibilityChange = () => {
      setVisibilityState(document.visibilityState);
    };
    document.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return visibilityState;
}
