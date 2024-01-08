import React from "react";
import { Link } from "react-router-dom";

const isSafari =
  navigator.userAgent.indexOf("Safari") > -1 &&
  // Chrome also has "Safari" in its user-agent string
  navigator.userAgent.indexOf("Chrome") === -1;

export default function MoonSvg() {
  return (
    <svg
      width="550"
      height="550"
      viewBox="0 0 550 550"
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
        stroke="url(#paint0_linear_sun)"
        strokeWidth="8px"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="4 12"
        fill="url(#paint0_radial_sun)"
      />
      <path
        id="circle2"
        fill="transparent"
        d="
      M 50,275
      a 225,225 0 1,1 450,2
      a 225,225 0 1,1 -450,2
    "
      />
      {/* TO enable later */}
      {/* <path
        id="circle3"
        fill="black"
        d="
      M 75,275
      a 200,200 0 1,1 400,2
      a 200,200 0 1,1 -400,2
    "
        z={5}
        fillOpacity={0.5}
      /> */}
      <defs>
        <radialGradient
          id="paint0_radial_sun"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(275 275) scale(200)"
        >
          <animate
            attributeName="r"
            dur="8000ms"
            repeatCount="indefinite"
            values=".95; 1.05; .95"
          />
          <stop stopColor="#d9ba4a" />
          <stop offset="0.75" stopColor="#ddc644"></stop>
          <stop offset="1" stopColor="#e59524" />
        </radialGradient>

        <linearGradient
          id="paint0_linear_sun"
          gradientUnits="userSpaceOnUse"
          gradientTransform="skewX(20) translate(-35, 0)"
        >
          <stop stopColor="#ebb000" />
          <stop offset="1" stopColor="#f33" />
        </linearGradient>

        <filter colorInterpolationFilters="sRGB" id="filter">
          <feTurbulence
            type="fractalNoise"
            result="cloudbase"
            baseFrequency=".0025"
            numOctaves="5"
            seed="24"
          />

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
              dur="10s"
              repeatCount="indefinite"
            />
          </feColorMatrix>

          <feColorMatrix
            in="cloud"
            result="wispy"
            type="matrix"
            values="4 0 0 0.5 -1
                                       4 0 0 0 -1
                                       2 0 0 0 -1
                                       0.5 0 0 0 0
                                       "
          />

          <feFlood floodColor="#fd94028e" result="red" />

          <feBlend mode="screen" in2="red" in="wispy" />

          <feGaussianBlur stdDeviation="3" />

          <feComposite operator="in" in2="SourceGraphic" />
          {/* <feColorMatrix
            in="myComposite"
            type="matrix"
            values="0   0   0   1   0
                0   0   0   0   0
                0   0   0   0   0
                0   0   0   0.2 0"
          >
            <animate
              id="blurredAnimation"
              attributeType="XML"
              attributeName="values"
              from="8 0 0 0 -1 4 0 4 3 -1 4 0 0 0 -1 1 0 0 0 0"
              to="3 0 0 0 -1 4 0 4 3 -1 4 0 0 0 -1 1 0 0 0 0"
              dur="1s"
              values="8 0 0 0 -1 4 0 4 3 -1 4 0 0 0 -1 1 0 0 0 0;3 0 0 0 -1 4 0 4 3 -1 4 0 0 0 -1 1 0 0 0 0;"
              keyTimes="0;1"
              begin="indefinite"
            />
          </feColorMatrix> */}
        </filter>
        <defs>
          <style>
            {`
              @import url('https://fonts.googleapis.com/css2?family=Bungee+Spice');
              @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600;700;900&display=swap');
            `}
          </style>
        </defs>
      </defs>
      <text fontFamily="'Inconsolata', monospace" id="sunText">
        <textPath
          fill="black"
          pointerEvents="fill"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xlinkHref="#circle2"
        >
          <Link to="/about">
            <tspan
              dx="25%"
              className="svg-link-tspan"
              fontSize="22px"
              vectorEffect="non-scaling-size"
            >
              about me 👋
            </tspan>
          </Link>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://engineering.ziphq.com/material-ui/"
          >
            <tspan
              className="svg-link-tspan"
              vectorEffect="non-scaling-size"
              fontSize="12px"
              dx="8%"
            >
              latest blog post
            </tspan>
          </a>
          <tspan fontSize="28px" dx="45%" dy="-24px">
            🪐
          </tspan>
          <tspan fontSize="28px" dx="20%" dy="16px">
            🌎
          </tspan>
        </textPath>
      </text>

      <style>
        {`
          #sunText {
            pointer-events: all;
            font-size: 20px;
            transform-origin: center;
            animation-timing-function: ease-in-out;
            ${isSafari ? "" : `animation: sun-rotate 20s linear infinite;`}
            &:hover {
              animation-play-state: paused;
            }
          }

          .svg-link-tspan {
            fill: black;
            font-weight: 400;
            transition: all 0.1s;

            &:hover {
              fill: #7400b3;
              // font-weight: 900;
              transform: scale(1.1);
              text-decoration: underline;
            }
          }

          @keyframes sun-rotate {
            0% {
              transform: rotate(0deg);
            }

            80% {
              transform: rotate(15deg);
            }

            100% {
              transform: rotate(360deg);
            }
          }

          #circle3 {
            // TO enable later
            // filter: url(#filter);
          }
        `}
      </style>
    </svg>
  );
}
