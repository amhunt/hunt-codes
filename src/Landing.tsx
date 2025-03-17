import React from "react";
import { Link } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { useOrbitalAnimation } from "./hooks/useOrbitalAnimation";

const CENTER_X = 300;
const CENTER_Y = 300;

const Landing = () => {
  useOrbitalAnimation(CENTER_X, CENTER_Y);

  return (
    <div className="landing-page">
      <svg id="solar-system" viewBox="0 0 600 600" style={{ display: "block" }}>
        <Link to="/home">
          <SunInternals size={0.25} radiusOffset={243} strokeWidth={0} />

          <text fontFamily="'Inconsolata', monospace" id="sunEnterText">
            <textPath
              fill="white"
              pointerEvents="fill"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              xlinkHref="#circle2"
            >
              <tspan
                dx="10%"
                className="svg-link-tspan"
                fontSize="22px"
                vectorEffect="non-scaling-size"
              >
                enter
              </tspan>
            </textPath>
          </text>
        </Link>
        <circle
          className="planet"
          id="planet1"
          cx="300"
          cy="180"
          r="12"
          fill="#ff6b6b" // Mars-ish
        />
        <circle
          className="planet"
          id="planet2"
          cx="300"
          cy="140"
          r="8"
          fill="#4ecdc4" // Neptune-ish
        />
        <circle
          className="planet"
          id="planet3"
          cx="300"
          cy="100"
          r="6"
          fill="#f7d794" // Saturn-ish
        />
        <ellipse
          id="planet3-ring"
          cx="300"
          cy="100"
          rx="12"
          ry="4"
          fill="none"
          stroke="#ccc"
          strokeWidth="1"
        />
        <circle
          className="planet"
          id="planet4"
          cx="300"
          cy="60"
          r="5"
          fill="#a8e6cf" // Uranus-;)
        />
      </svg>
    </div>
  );
};

export default React.memo(Landing);
