import React from "react";

export function SunInternals({
  size = 1,
  radiusOffset = 75,
}: {
  size?: number;
  radiusOffset?: number;
}) {
  // Base radius values that will be scaled
  const innerRadius = 175 * size;
  const outerRadius = 200 * size;
  const center = outerRadius + radiusOffset;

  return (
    <>
      <path
        id="circle-bg"
        d={`
          M ${center - innerRadius},${center}
          a ${innerRadius},${innerRadius} 0 1,1 ${innerRadius * 2},2
          a ${innerRadius},${innerRadius} 0 1,1 ${-innerRadius * 2},2
        `}
        z={1}
        fill="url(#sun-core-radial-gradient)"
      />
      <path
        id="circle2"
        fill="transparent"
        d={`
          M ${center - outerRadius},${center}
          a ${outerRadius},${outerRadius} 0 1,1 ${outerRadius * 2},2
          a ${outerRadius},${outerRadius} 0 1,1 ${-outerRadius * 2},2
        `}
      />
      <path
        id="circle3"
        fill="#ffffff"
        d={`
          M ${center - innerRadius},${center}
          a ${innerRadius},${innerRadius} 0 1,1 ${innerRadius * 2},2
          a ${innerRadius},${innerRadius} 0 1,1 ${-innerRadius * 2},2
        `}
        z={5}
        fillOpacity={0.5}
      />
      <defs>
        <radialGradient
          id="sun-core-radial-gradient"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform={`translate(${center} ${center}) scale(${innerRadius})`}
        >
          {/* Animates the border in and out, giving the sun the appearance of "breathing" */}
          <animate
            attributeName="r"
            dur="8000ms"
            repeatCount="indefinite"
            values=".95; 1.05; .95"
          />
          <stop stopColor="#ffd75e" />
          <stop offset="0.75" stopColor="#ffb824"></stop>
          <stop offset="1" stopColor="#ff6a00" />
        </radialGradient>
        <filter
          id="heavycloud"
          colorInterpolationFilters="sRGB"
          x="0%"
          y="0%"
          height="100%"
          width="100%"
        >
          <feTurbulence
            type="fractalNoise"
            result="cloudbase"
            baseFrequency=".016"
            numOctaves="3"
            seed="34"
          >
            <animate
              attributeName="baseFrequency"
              values="0.01; 0.02"
              dur="60s"
              repeatCount="indefinite"
            ></animate>
          </feTurbulence>
          <feColorMatrix
            in="cloudbase"
            type="hueRotate"
            values="0"
            result="cloud"
          >
            <animate
              attributeName="values"
              from="0"
              to="360"
              dur="6s"
              repeatCount="indefinite"
            ></animate>
          </feColorMatrix>
          <feColorMatrix
            in="cloud"
            result="wispy"
            type="matrix"
            values="
              3 2 2 0.5 -0.15
              1 0 1 0 -0.25
              1 0 0 0 -0.95
              0.5 0 0 0 0.8
            "
          ></feColorMatrix>
          <feFlood floodColor="#ffdd00" result="yellow-flood"></feFlood>
          <feBlend mode="multiply" in2="yellow-flood" in="wispy"></feBlend>
          <feGaussianBlur stdDeviation="1"></feGaussianBlur>
          <feComposite operator="in" in2="SourceGraphic"></feComposite>
        </filter>
        <defs>
          <style>
            {`@import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600;700;900&display=swap');`}
          </style>
        </defs>
      </defs>
      <style>
        {`
          #circle3 {
            filter: url(#heavycloud);
          }
        `}
      </style>
    </>
  );
}

export default function SunSvg({ size = 1 }: { size?: number }) {
  return (
    <svg
      width={550 * size}
      height={550 * size}
      viewBox={`0 0 ${550 * size} ${550 * size}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <SunInternals size={size} />
    </svg>
  );
}
