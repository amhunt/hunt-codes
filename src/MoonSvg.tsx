import React from "react";

export default function MoonSvg() {
  return (
    <svg
      width="550"
      height="550"
      viewBox="0 0 550 550"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <path
        id="circle"
        transform="rotate(12,275,275)"
        d="
      M 75,275
      a 200,200 0 1,1 400,2
      a 200,200 0 1,1 -400,2
    "
        stroke="url(#paint0_linear_moon)"
        fill="url(#paint0_radial_moon)"
      />
      <defs>
        <radialGradient
          id="paint0_radial_moon"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(200 280) rotate(86.3225) scale(265.046)"
        >
          <stop stopColor="#080556" />
          <stop offset="1" stopColor="#0a0030" />
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
          <tspan
            transform="rotateZ(60deg)"
            id="spaceship"
            fontSizeAdjust={5}
            fontSize={40}
            dy="-8px"
            dx="20em"
          >
            🛸
          </tspan>
          <tspan dx="15em">
            <tspan id="wave-emoji">👋</tspan> Hi, I’m Andrew
          </tspan>
          <tspan dx="25em">nice 2 meet u</tspan>
        </textPath>
      </text>

      <style>
        {`
          @import url('https://fonts.googleapis.com/css2?family=Bungee+Spice&display=swap');

          #moonText {
            font-size: 24px;
            animation: rotate 30s linear infinite;
            transform-origin: center;
            filter: hue-rotate(90deg);
          }

          #spaceship {
            animation: rotate 3s linear infinite;
            transform-origin: center;
            transform: rotateZ(60deg);
          }

          #wave-emoji {
            filter: hue-rotate(260deg) brightness(1.5);
          }

          #rainbow-text {
            animation: wave 2s infinite alternate;

          }

          @keyframes wave {
            0% {
            filter: hue-rotate(0deg) brightness(.76);
            transform: rotate(0deg);
            }

            100% {
            filter: hue-rotate(360deg) brightness(1.5);
            transform: rotate(0deg);
            }
          }

          @keyframes rotate {
            0% {
              transform: rotate(360deg);
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
