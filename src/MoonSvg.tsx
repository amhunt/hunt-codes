import React from "react";

let isSafari =
  navigator.userAgent.indexOf("Safari") > -1 &&
  // Chrome also has "Safari" in its user-agent string
  navigator.userAgent.indexOf("Chrome") < 1;

export default function MoonSvg() {
  return (
    <svg
      width="550"
      height="550"
      viewBox="0 0 550 550"
      fill="none"
      style={{ shapeRendering: "geometricPrecision" }}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        id="circle"
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
        id="circle2"
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

      <text
        // fill="white"
        fontFamily="Bungee Spice"
        // vectorEffect="non-rotation"
        id="moonText"
      >
        <textPath
          id="rainbow-text"
          fill="white"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xlinkHref="#circle"
        >
          <tspan fontSize={40} dy="-8px">
            🛸
          </tspan>
          <tspan dx="30%">
            <tspan id="wave-emoji">👋</tspan> Hi, I’m Andrew
          </tspan>
          <tspan dx="30%">nice 2 meet u</tspan>
        </textPath>
      </text>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bungee+Spice&display=swap');

          #moonText {
            font-size: 24px;
            transform-origin: center;
            // The transform-origin is wrong on safari
            ${isSafari ? "" : `animation: moon-rotate 30s linear infinite;`}
            shape-rendering: geometricPrecision;
            filter: hue-rotate(90deg);
          }

          #circle2 {
            animation: moon-rotate 20s reverse linear infinite;
            transform-origin: center;
          }

          #wave-emoji {
            filter: hue-rotate(260deg) brightness(1.5);
          }

          #rainbow-text {
            // animation: wave 2s infinite alternate;
          }

          @keyframes wave {
            0% {
              filter: hue-rotate(0deg) brightness(.76);
            }

            100% {
              filter: hue-rotate(360deg) brightness(1.5);
            }
          }

          @keyframes moon-rotate {
            0% {
              transform: rotate(360deg);
            }
            51% {
              transform: rotate(180deg);
            }

            100% {
              transform: rotate(0deg);
            }
          }
        `}
      </style>
    </svg>
  );
}
