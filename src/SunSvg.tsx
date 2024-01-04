import React from "react";
import { Link } from "react-router-dom";

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
        stroke="url(#paint0_linear_sun)"
        strokeWidth="8px"
        vectorEffect="non-scaling-stroke"
        strokeDasharray="4 12"
        fill="url(#paint0_radial_sun)"
      />
      <defs>
        <radialGradient
          id="paint0_radial_sun"
          cx="0"
          cy="0"
          r="1"
          gradientUnits="userSpaceOnUse"
          gradientTransform="translate(225 219.5) rotate(86.3225) scale(265.046)"
        >
          <stop stopColor="#ddcc44" />
          <stop offset="1" stopColor="#eecc44" />
        </radialGradient>

        <linearGradient
          id="paint0_linear_sun"
          gradientUnits="userSpaceOnUse"
          gradientTransform="skewX(20) translate(-35, 0)"
        >
          <stop stopColor="#ebb000" />
          <stop offset="1" stopColor="#f66332" />
        </linearGradient>

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
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xlinkHref="#circle"
        >
          <Link className="svg-link " to="/about">
            <tspan vectorEffect="non-scaling-size" dy="-12px" dx="5em">
              about me 👋
            </tspan>
          </Link>

          <a
            className="svg-link"
            target="_blank"
            rel="noopener noreferrer"
            href="https://engineering.ziphq.com/material-ui/"
          >
            <tspan fontSize="12px" dx="3em">
              latest blog post
            </tspan>
          </a>
          <tspan fontSize="28px" dx="15em" dy="-24px">
            🪐
          </tspan>
          <tspan fontSize="28px" dx="5em" dy="16px">
            🌎
          </tspan>
        </textPath>
      </text>

      <style>
        {`
          #sunText {
            pointer-events: visibleFill;
            font-size: 20px;
            animation: sun-rotate 20s linear infinite;
            transform-origin: center;
            &:hover {
              animation-play-state: paused;
              transform: scale(1.1);

            }
          }

          .svg-link {
            transition: all 0.2s ease-in-out;
            &:hover {
              font-weight: 700;
              text-decoration: none;
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
        `}
      </style>
    </svg>
  );
}
