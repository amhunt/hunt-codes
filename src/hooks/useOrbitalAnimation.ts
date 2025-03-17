import { useEffect, useRef } from "react";

interface Planet {
  element: SVGCircleElement | SVGEllipseElement;
  orbit: number;
  speed: number;
}

export const useOrbitalAnimation = (centerX: number, centerY: number) => {
  const animationFrameRef = useRef<number>();
  const anglesRef = useRef<{ [key: string]: number }>({});

  useEffect(() => {
    const planets: Planet[] = [];
    let lastTime = performance.now();

    // Get all elements once at initialization
    for (let i = 1; i <= 4; i++) {
      const planet = document.getElementById(
        `planet${i}`
      ) as unknown as SVGCircleElement;
      if (planet) {
        planets.push({
          element: planet,
          orbit: i * 40 + 80, // ORBIT_1: 120, ORBIT_2: 160, ORBIT_3: 200, etc.
          speed: -i * 0.412 + 2, // Increasing speeds: 0.5, 0.9, 1.3, 1.7
        });
        anglesRef.current[`angle${i}`] = 0;
      }
    }

    // Add Saturn's ring
    const ring = document.getElementById(
      "planet3-ring"
    ) as unknown as SVGEllipseElement;
    if (ring) {
      planets.push({
        element: ring,
        orbit: planets[3].orbit, // Same as planet3
        speed: planets[3].speed, // Same as planet3
      });
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      planets.forEach((planet, index) => {
        const angleKey = `angle${Math.min(index + 1, 4)}`;
        anglesRef.current[angleKey] += planet.speed * (deltaTime / 16); // Normalize to 60fps

        const rad = (anglesRef.current[angleKey] * Math.PI) / 180;
        const x = centerX + planet.orbit * Math.cos(rad);
        const y = centerY + planet.orbit * Math.sin(rad);

        planet.element.setAttribute("cx", x.toString());
        planet.element.setAttribute("cy", y.toString());
      });

      animationFrameRef.current = requestAnimationFrame(animate);
    };

    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [centerX, centerY]);
};
