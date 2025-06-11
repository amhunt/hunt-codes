import { useEffect, useRef } from "react";

interface Planet {
  element: SVGCircleElement | SVGEllipseElement;
  orbit: number;
  speed: number;
  angleKey: string;
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
          angleKey: `angle${i}`,
        });
        anglesRef.current[`angle${i}`] = 0;
      }
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;

      planets.forEach((planet, index) => {
        anglesRef.current[planet.angleKey] += planet.speed * (deltaTime / 16); // Normalize to 60fps

        const rad = (anglesRef.current[planet.angleKey] * Math.PI) / 180;
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
