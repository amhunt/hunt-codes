import { useEffect, useState } from "react";

export default function usePageVisibilityState() {
  const [visibilityState, setVisibilityState] = useState<"visible" | "hidden">(
    document.visibilityState
  );

  // this useEffect sets up a listener for visibilitychange events, to update a visibility state value
  useEffect(() => {
    const handleVisibilityChange = () => {
      setVisibilityState(document.visibilityState);
    };
    window.addEventListener("visibilitychange", handleVisibilityChange, {
      passive: true,
    });
    return () => {
      window.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, []);

  return visibilityState;
}
