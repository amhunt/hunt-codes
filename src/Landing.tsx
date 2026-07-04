import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { hoverState } from "./solarHover";
import { useOrbitalAnimation } from "./hooks/useOrbitalAnimation";
import {
  PLANET_CONFIGS,
  SOLAR_SYSTEM_CENTER,
  SUN_RADIUS_OFFSET,
  SUN_SIZE,
} from "./landingScene";

const CENTER_X = SOLAR_SYSTEM_CENTER;
const CENTER_Y = SOLAR_SYSTEM_CENTER;

// The solar system's 4s-delayed fadeIn is first-visit choreography (the
// stars assemble first). Landing remounts on every visit, and replaying
// that delay when returning from /home would hide the whole system — and
// the sun flying back into it — for 5 seconds.
let hasPlayedIntro = false;

const PlanetLabel = ({
  id,
  href,
  children,
}: {
  id: string;
  href: string;
  children: React.ReactNode;
}) => {
  return (
    <text
      dominantBaseline="middle"
      textAnchor="middle"
      fontFamily="'Inconsolata', monospace"
      className="planet-label"
    >
      <textPath
        id={id}
        href={href}
        startOffset="25%"
        fill="white"
        fontSize="14px"
      >
        {children}
      </textPath>
    </text>
  );
};

const Landing = () => {
  // Drives the flat SVG planets until the WebGL scene (SolarSystem3D)
  // loads and takes over; the SVG keeps the sun, orbits and labels.
  useOrbitalAnimation(CENTER_X, CENTER_Y);

  const skipIntroDelay = hasPlayedIntro;
  useEffect(() => {
    hasPlayedIntro = true;
  }, []);

  // Clicking ENTER navigates away without a pointerleave — don't leave
  // the sun's hover glow stuck on
  useEffect(
    () => () => {
      hoverState.sun = false;
    },
    [],
  );

  return (
    <div className="landing-page">
      <svg
        id="solar-system"
        className={skipIntroDelay ? "no-intro-delay" : undefined}
        viewBox="0 0 600 600"
        style={{ display: "block" }}
      >
        <defs>
          {/* Mercury gradient - gray cratered rock */}
          <radialGradient id="planet1Gradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#c4bab0" />
            <stop offset="70%" stopColor="#9d938a" />
            <stop offset="100%" stopColor="#6e655d" />
          </radialGradient>

          {/* Venus gradient - thick tan cloud deck */}
          <radialGradient id="planet2Gradient" cx="30%" cy="30%">
            <stop offset="0%" stopColor="#f0d9a0" />
            <stop offset="70%" stopColor="#d9b26a" />
            <stop offset="100%" stopColor="#b58a3e" />
          </radialGradient>

          {/* Earth gradient - blue oceans */}
          <radialGradient id="planet3Gradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#6ab0ff" />
            <stop offset="70%" stopColor="#20549c" />
            <stop offset="100%" stopColor="#1c3f7a" />
          </radialGradient>

          {/* Mars gradient - rust-red deserts */}
          <radialGradient id="planet4Gradient" cx="35%" cy="35%">
            <stop offset="0%" stopColor="#e0855e" />
            <stop offset="70%" stopColor="#c1583b" />
            <stop offset="100%" stopColor="#8a3b24" />
          </radialGradient>
        </defs>

        <Link
          to="/home"
          onPointerEnter={() => {
            hoverState.sun = true;
          }}
          onPointerLeave={() => {
            hoverState.sun = false;
          }}
        >
          <SunInternals size={SUN_SIZE} radiusOffset={SUN_RADIUS_OFFSET} />
          <text
            className="landing-enter-text"
            fontFamily="'Retro Floral', 'Inconsolata', monospace"
          >
            <textPath
              fill="white"
              pointerEvents="fill"
              xmlnsXlink="http://www.w3.org/1999/xlink"
              xlinkHref="#circle2"
            >
              <tspan
                dx="50px"
                className="svg-link-tspan"
                fontSize="22px"
                vectorEffect="non-scaling-size"
              >
                ENTER
              </tspan>
            </textPath>
          </text>
        </Link>

        <path
          id="orbit1"
          className="orbit-path"
          d={`
          M ${CENTER_X - PLANET_CONFIGS[0].orbit},${CENTER_X}
          a ${PLANET_CONFIGS[0].orbit},${PLANET_CONFIGS[0].orbit} 0 1,1 ${PLANET_CONFIGS[0].orbit * 2},2
          a ${PLANET_CONFIGS[0].orbit},${PLANET_CONFIGS[0].orbit} 0 1,1 ${-PLANET_CONFIGS[0].orbit * 2},2
        `}
        />

        <path
          id="orbit2"
          className="orbit-path"
          d={`
          M ${CENTER_X - PLANET_CONFIGS[1].orbit},${CENTER_X}
          a ${PLANET_CONFIGS[1].orbit},${PLANET_CONFIGS[1].orbit} 0 1,1 ${PLANET_CONFIGS[1].orbit * 2},2
          a ${PLANET_CONFIGS[1].orbit},${PLANET_CONFIGS[1].orbit} 0 1,1 ${-PLANET_CONFIGS[1].orbit * 2},2
        `}
        />

        <path
          id="orbit3"
          className="orbit-path"
          d={`
          M ${CENTER_X - PLANET_CONFIGS[2].orbit},${CENTER_X}
          a ${PLANET_CONFIGS[2].orbit},${PLANET_CONFIGS[2].orbit} 0 1,1 ${PLANET_CONFIGS[2].orbit * 2},2
          a ${PLANET_CONFIGS[2].orbit},${PLANET_CONFIGS[2].orbit} 0 1,1 ${-PLANET_CONFIGS[2].orbit * 2},2
        `}
        />

        <path
          id="orbit4"
          className="orbit-path"
          d={`
          M ${CENTER_X - PLANET_CONFIGS[3].orbit},${CENTER_X}
          a ${PLANET_CONFIGS[3].orbit},${PLANET_CONFIGS[3].orbit} 0 1,1 ${PLANET_CONFIGS[3].orbit * 2},2
          a ${PLANET_CONFIGS[3].orbit},${PLANET_CONFIGS[3].orbit} 0 1,1 ${-PLANET_CONFIGS[3].orbit * 2},2
        `}
        />

        {/* Flat SVG planets: the always-on fallback. They render and
            animate until the WebGL scene loads and hides them (and come
            back if it goes away). */}
        {PLANET_CONFIGS.map((planet) => (
          <circle
            key={planet.id}
            className="planet"
            id={planet.id}
            cx="300"
            cy={planet.orbit}
            r={planet.radius}
          />
        ))}

        {/* Curved text labels trailing behind each planet */}
        {PLANET_CONFIGS.map((planet, index) => (
          <PlanetLabel
            key={planet.id}
            id={`${planet.id}Label`}
            href={`#orbit${index + 1}`}
          >
            {planet.content}
          </PlanetLabel>
        ))}

        <style>
          {`        .planet-label {
            pointer-events: all;
            font-size: 20px;
            transform-origin: center;
            animation-timing-function: ease-in-out;
            // animation: sun-rotate 20s linear infinite;
            &:hover {
              animation-play-state: paused;
            }
          }
            `}
        </style>
      </svg>
    </div>
  );
};

export default React.memo(Landing);
