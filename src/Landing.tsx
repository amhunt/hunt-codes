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
        <defs>
          {/* Mars gradient - red planet with surface variations */}
          <radialGradient id="planet1Gradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#aa4135" />
            <stop offset="70%" stopColor="#872c22" />
            <stop offset="100%" stopColor="#62170f" />
          </radialGradient>

          {/* Neptune gradient - blue gas giant with atmospheric depth */}
          <radialGradient id="planet2Gradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#347dae" />
            <stop offset="70%" stopColor="#195882" />
            <stop offset="100%" stopColor="#0e476d" />
          </radialGradient>

          {/* Saturn gradient - golden planet with warm tones */}
          <radialGradient id="planet3Gradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#e98e3e" />
            <stop offset="70%" stopColor="#c76714" />
            <stop offset="100%" stopColor="#8d480c" />
          </radialGradient>

          {/* Uranus gradient - ice giant with cool tones */}
          <radialGradient id="planet4Gradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#32ae38" />
            <stop offset="70%" stopColor="#1a8920" />
            <stop offset="100%" stopColor="#127117" />
          </radialGradient>
        </defs>

        <Link className="sun-link" to="/home">
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
        <circle className="planet" id="planet1" cx="300" cy="180" r="6" />
        <circle className="planet" id="planet2" cx="300" cy="140" r="8" />
        <circle className="planet" id="planet3" cx="300" cy="100" r="6" />
        <circle className="planet" id="planet4" cx="300" cy="60" r="5" />
      </svg>
    </div>
  );
};

export default React.memo(Landing);
