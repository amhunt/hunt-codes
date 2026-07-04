import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { SunInternals } from "SunSvg";
import { hoverState } from "./solarHover";
import { SUN_RADIUS_OFFSET, SUN_SIZE } from "./landingScene";

// The solar system's 4s-delayed fadeIn is first-visit choreography (the
// stars assemble first). Landing remounts on every visit, and replaying
// that delay when returning from /home would hide the whole system — and
// the sun flying back into it — for 5 seconds.
let hasPlayedIntro = false;

const Landing = () => {
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

  // The orbits and planets are the WebGL scene's (SolarScene); this SVG
  // only carries the clickable ENTER sun ring, which SunSvgAnchor glues
  // to the projected 3D sun each frame.
  return (
    <div className="landing-page">
      <svg
        id="solar-system"
        className={skipIntroDelay ? "no-intro-delay" : undefined}
        viewBox="0 0 600 600"
        style={{ display: "block" }}
      >
        <Link
          to="/home"
          onPointerEnter={() => {
            hoverState.sun = true;
          }}
          onPointerLeave={() => {
            hoverState.sun = false;
          }}
        >
          {/* The "ENTER" label itself is drawn by the WebGL sun; this SVG
              supplies the clickable disc the label rings */}
          <SunInternals size={SUN_SIZE} radiusOffset={SUN_RADIUS_OFFSET} />
        </Link>
      </svg>
    </div>
  );
};

export default React.memo(Landing);
