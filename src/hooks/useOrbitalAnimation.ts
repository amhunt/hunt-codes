import { useEffect, useRef } from "react";

interface Planet {
  element: SVGCircleElement | SVGEllipseElement;
  orbit: number;
  id: string;
  speed: number;
  angleKey: string;
}

export const PLANET_CONFIGS = [
  {
    id: "planet1",
    orbit: 100,
    content: " ",
    speed: 2,
    angleKey: "angle1",
    textNameOffset: 30,
  },
  {
    id: "planet2",
    orbit: 160,
    content: "WORLD",
    speed: 1.8,
    angleKey: "angle2",
    textNameOffset: 28.5,
  },
  {
    id: "planet3",
    orbit: 200,
    content: "HELLO",
    speed: 1.9,
    angleKey: "angle3",
    textNameOffset: 28.25,
  },
  {
    id: "planet4",
    orbit: 240,
    content: " ",
    speed: 1.4,
    angleKey: "angle4",
    textNameOffset: 27.4,
  },
];

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
          orbit: PLANET_CONFIGS[i - 1].orbit,
          speed: PLANET_CONFIGS[i - 1].speed,
          angleKey: `angle${i}`,
        });
        anglesRef.current[`angle${i}`] = 0;
      }
    }

    const animate = (currentTime: number) => {
      const deltaTime = currentTime - lastTime;
      lastTime = currentTime;
      const normalizedDelta = deltaTime * FRAME_RATE_NORMALIZER;

      planets.forEach((planet, planetIndex) => {
        anglesRef.current[planet.angleKey] += planet.speed * normalizedDelta;
        const rad = anglesRef.current[planet.angleKey] * DEG_TO_RAD;

        const x = centerX + planet.orbit * Math.cos(rad);
        const y = centerY + planet.orbit * Math.sin(rad);

        planet.element.setAttribute("cx", x.toString());
        planet.element.setAttribute("cy", y.toString());

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
        // Set each gradient's cx and cy to be based on the planet's position in relation to the sun / centerX and centerY
        const gradient = document.getElementById(
          `${planet.id}Gradient`
        ) as unknown as SVGRadialGradientElement;
        if (gradient) {
          // Set the gradient's cx and cy to be a % based on the planet's angle in relation to the sun / centerX and centerY
          gradient.setAttribute("cx", `${cxPercent * 100}%`);
          gradient.setAttribute("cy", `${cyPercent * 100}%`);
        }

        const label = document.getElementById(
          `${planet.id}Label`
        ) as unknown as SVGTextElement;
        if (label) {
          // Set offset of label to be right behind the planet
          label.setAttribute(
            "startOffset",
            `${(yModAnglePercent * 100 - PLANET_CONFIGS[planetIndex].textNameOffset) % 100}%`
          );
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
