import { useEffect, useState } from "react";

export default function useWindowSize() {
  const [size, setSize] = useState<"sm" | "md" | "lg">(
    window.innerWidth < 768 ? "sm" : window.innerWidth < 1000 ? "md" : "lg"
  );

  // this useEffect sets up a listener for window resize events, to update a width state value
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) {
        setSize("sm");
      } else if (window.innerWidth < 1000) {
        setSize("md");
      } else {
        setSize("lg");
      }
    };
    window.addEventListener("resize", handleResize);
    return () => {
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return size;
}
