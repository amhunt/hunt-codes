import { useEffect, useRef } from "react";

interface Planet {
  element: SVGCircleElement | SVGEllipseElement;
  orbit: number;
  id: string;
  speed: number;
  angleKey: string;
}

// Pre-calculate constants
const DEG_TO_RAD = Math.PI / 180;
const FRAME_RATE_NORMALIZER = 1 / 60;

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
          id: `planet${i}`,
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
      const normalizedDelta = deltaTime * FRAME_RATE_NORMALIZER;

      planets.forEach((planet) => {
        anglesRef.current[planet.angleKey] += planet.speed * normalizedDelta;
        const rad = anglesRef.current[planet.angleKey] * DEG_TO_RAD;

        const x = centerX + planet.orbit * Math.cos(rad);
        const y = centerY + planet.orbit * Math.sin(rad);

        planet.element.setAttribute("cx", x.toString());
        planet.element.setAttribute("cy", y.toString());
        if (planet.id === "planet1") {
          console.log(
            "planet",
            planet.id,
            anglesRef.current[planet.angleKey],
            anglesRef.current[planet.angleKey] / 360
          );
        }
        const xModAngle = anglesRef.current[planet.angleKey] % 360;
        const xModAnglePercent = xModAngle / 360;
        // The closer to 0 or 360, the further right the cx percent should be
        const cxPercent =
          // This value (w/o the 0.25 addition) ranges from 0 to .5
          (xModAnglePercent > 0.5 ? 1 - xModAnglePercent : xModAnglePercent) +
          0.25;
        // Offset the angle by 270 degrees (90 degrees from the top) before modding it
        const yModAngle = (anglesRef.current[planet.angleKey] + 270) % 360;
        const yModAnglePercent = yModAngle / 360;
        const cyPercent =
          // This value (w/o the 0.25 addition) ranges from 0 to .5
          (yModAnglePercent > 0.5 ? 1 - yModAnglePercent : yModAnglePercent) +
          0.25;
        if (planet.id === "planet1") {
          console.log("cxPercent", cxPercent);
          console.log("cyPercent", cyPercent);
        }

        // Set each gradient's cx and cy to be based on the planet's position in relation to the sun / centerX and centerY
        const gradient = document.getElementById(
          `${planet.id}Gradient`
        ) as unknown as SVGRadialGradientElement;
        if (gradient) {
          // Set the gradient's cx and cy to be a % based on the planet's angle in relation to the sun / centerX and centerY
          gradient.setAttribute("cx", `${cxPercent * 100}%`);
          gradient.setAttribute("cy", `${cyPercent * 100}%`);
        }
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
