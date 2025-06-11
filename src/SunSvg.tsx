import React from "react";
import { Link } from "react-router-dom";
import useWindowWidth from "useWindowWidth";

const isSafari =
  navigator.userAgent.indexOf("Safari") > -1 &&
  // Chrome also has "Safari" in its user-agent string
  navigator.userAgent.indexOf("Chrome") === -1;

export function SunInternals({
  size = 1,
  radiusOffset = 50,
  strokeWidth = 24,
}: {
  size?: number;
  radiusOffset?: number;
  strokeWidth?: number;
}) {
  // Base radius values that will be scaled
  const innerRadius = 200 * size;
  const outerRadius = 225 * size;
  const center = outerRadius + radiusOffset;

  return (
    <>
      <path
        id="circle-stroke"
        d={`
          M ${center - innerRadius},${center}
          a ${innerRadius},${innerRadius} 0 1,1 ${innerRadius * 2},2
          a ${innerRadius},${innerRadius} 0 1,1 ${-innerRadius * 2},2
        `}
        stroke="url(#sun-rays-gradient)"
        strokeWidth={`${strokeWidth}px`}
        fill="none"
        vectorEffect="non-scaling-stroke"
        strokeDasharray={`${4 * size} ${36 * size}`}
      />
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
          <stop stopColor="#ffc800" />
          <stop offset="0.75" stopColor="#ffd900"></stop>
          <stop offset="1" stopColor="#ff7b15" />
        </radialGradient>
        <linearGradient
          id="sun-rays-gradient"
          gradientUnits="userSpaceOnUse"
          gradientTransform="skewX(20) translate(-35, 0)"
        >
          <stop stopColor="#ebb000" />
          <stop offset="1" stopColor="#d26003" />
        </linearGradient>
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
            {`
              @import url('https://fonts.googleapis.com/css2?family=Bungee+Spice');
              @import url('https://fonts.googleapis.com/css2?family=Inconsolata:wght@300;400;500;600;700;900&display=swap');
            `}
          </style>
        </defs>
      </defs>
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
            transition: fill 0.1s;

            &:hover {
              fill: #7400b3;
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
            filter: url(#heavycloud);
          }
        `}
      </style>
    </>
  );
}

export default function SunSvg({
  isHome,
  size = 1,
}: {
  isHome?: boolean;
  size?: number;
}) {
  const { width } = useWindowWidth();

  const isSmall = width < 768;

  return (
    <svg
      width={550 * size}
      height={550 * size}
      viewBox={`0 0 ${550 * size} ${550 * size}`}
      xmlns="http://www.w3.org/2000/svg"
      xmlnsXlink="http://www.w3.org/1999/xlink"
    >
      <SunInternals size={size} />
      <text fontFamily="'Inconsolata', monospace" id="sunText">
        <textPath
          fill="black"
          pointerEvents="fill"
          xmlnsXlink="http://www.w3.org/1999/xlink"
          xlinkHref="#circle2"
        >
          {isHome && (
            <>
              <Link to="/about">
                <tspan
                  dx={isSmall ? "35%" : "5%"}
                  className="svg-link-tspan"
                  fontSize="20px"
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
                  fontSize="14px"
                  dx={isSmall ? "5%" : "8%"}
                >
                  {isSmall ? "Zip blog" : "latest blog post"}
                </tspan>
              </a>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://andrew-hunt.medium.com/"
              >
                <tspan
                  className="svg-link-tspan"
                  vectorEffect="non-scaling-size"
                  fontSize="14px"
                  dx={isSmall ? "5%" : "8%"}
                >
                  {isSmall ? "old blog" : "old personal blog"}
                </tspan>
              </a>
              <tspan fontSize="28px" dx="45%" dy="-24px">
                🪐
              </tspan>
              <tspan fontSize="28px" dx="20%" dy="16px">
                🌎
              </tspan>
            </>
          )}
        </textPath>
      </text>
    </svg>
  );
}
