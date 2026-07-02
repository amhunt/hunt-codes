import React from "react";

// Geometry of the moon disc, exported for the WebGL scene (space3d/Moon3D)
// that tracks this SVG and replaces the disc fill with a 3D sphere while
// it is rendering. Keep these in sync with the path + viewBox below.
export const MOON_SVG_ID = "moon-svg";
export const MOON_DISC_ID = "moon-disc";
export const MOON_VIEWBOX = 550;
export const MOON_CX = 275;
export const MOON_CY = 276;
export const MOON_R = 200;

export default function MoonSvg() {
  return (
    <svg
      id={MOON_SVG_ID}
      width="550"
      height="550"
      viewBox="0 0 550 550"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        id={MOON_DISC_ID}
        d="
      M 75,275
      a 200,200 0 1,1 400,2
      a 200,200 0 1,1 -400,2
    "
        strokeWidth={2}
        stroke="url(#paint0_linear_moon)"
        fill="url(#paint0_radial_moon)"
      />

      <path
        id="eclipse-overlay"
        d="
      M 75,275
      a 200,200 0 1,1 400,2
      a 200,200 0 1,1 -400,2
    "
        opacity={0.3}
        strokeWidth={2}
        stroke="transparent"
        fill="url(#paint0_radial_moon_overlay)"
        z={2}
      />
      <defs>
        <radialGradient
          id="paint0_radial_moon"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200 280) scale(275)"
        >
          <stop stopColor="#080556" />
          <stop offset="1" stopColor="#0a0030" />
        </radialGradient>

        <radialGradient
          id="paint0_radial_moon_overlay"
          cx="0"
          cy="0"
          r="1.1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(380 280) scale(275)"
        >
          <stop offset="0%" stopColor="transparent" />
          <stop offset="80%" stopColor="transparent" />
          <stop offset="100%" stopColor="#fff" />
        </radialGradient>

        <linearGradient id="paint0_linear_moon" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor="#080556">
            <animate
              attributeName="stop-color"
              dur="4500ms"
              repeatCount="indefinite"
              values="#080556; #d12af2; #080556"
            />
          </stop>
          <stop offset="100%" stopColor="#fff">
            <animate
              attributeName="stop-color"
              dur="4500ms"
              repeatCount="indefinite"
              values="#fff; #0800ec; #fff"
            />
          </stop>
        </linearGradient>
        <style>
          {`@import url('https://fonts.googleapis.com/css2?family=Bungee+Spice');`}
        </style>
      </defs>

      <text fontFamily="Bungee Spice" id="moonText">
        <textPath
          id="rainbow-text"
          fill="white"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xlinkHref="#circle"
        >
          <tspan fontSize={60} dy="-8px">
            🛸
          </tspan>
          <tspan dx="40%">
            <tspan id="wave-emoji">👽</tspan> Hi there
          </tspan>
          <tspan dx="40%">welcome to space</tspan>
        </textPath>
      </text>

      <style>
        {`
          #moonText {
            font-size: 24px;
            transform-origin: center;

            /* The transform-origin is wrong on safari */
            transform: rotate(160deg);
            animation: moon-rotate 30s linear both infinite;
            shape-rendering: geometricPrecision;
            filter: hue-rotate(90deg);
          }

          #eclipse-overlay {
            animation: moon-rotate 20s reverse linear infinite;
            transform-origin: center;
          }

          #wave-emoji {
            filter: hue-rotate(260deg) brightness(1.5);
          }

          #rainbow-text {
            animation: wave 5s infinite linear;
          }

          @keyframes wave {
            0% {
              filter: hue-rotate(0deg);
            }

            100% {
              filter: hue-rotate(360deg);
            }
          }

          @keyframes moon-rotate {
            0% {
              transform: rotate(160deg);
            }

            50% {
              transform: rotate(-20deg);
            }

            100% {
              transform: rotate(-200deg);
            }
          }
        `}
      </style>
    </svg>
  );
}
