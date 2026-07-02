import React, { useEffect, useState } from "react";
import cx from "classnames";
import MoonSvg from "./MoonSvg";
import SunSvg from "./SunSvg";

const Galaxy = ({
  isNightMode,
  forceSun = false,
}: {
  isNightMode: boolean;
  /** Home page: the sun (with its orbiting links) stays up in both modes,
   *  and the moon never rises here. */
  forceSun?: boolean;
}) => {
  // The sun is up in day mode, or always when forced (home page)
  const sunUp = forceSun || !isNightMode;
  const [hasMounted, setHasMounted] = useState(false);
  const [hideMoon, setHideMoon] = useState(sunUp);
  const [hideSun, setHideSun] = useState(!sunUp);

  // hideMoon/hideSun lag the mode change by a second so the rise/set
  // animation can finish before the leaving body stops being rendered.
  useEffect(() => {
    const moonTimeout = setTimeout(() => setHideMoon(sunUp), 1000);
    const sunTimeout = setTimeout(() => setHideSun(!sunUp), 1000);
    return () => {
      clearTimeout(moonTimeout);
      clearTimeout(sunTimeout);
    };
  }, [sunUp]);

  useEffect(() => {
    const mountTimeout = setTimeout(() => setHasMounted(true), 1000);
    return () => clearTimeout(mountTimeout);
  }, []);

  return (
    <div className="planet-container">
      {!hideSun && (
        <div
          className={cx(
            "planet1",
            "planet1_day",
            hasMounted && (sunUp ? "on" : "off"),
          )}
        >
          <SunSvg isHome />
        </div>
      )}
      {!hideMoon && (
        <div
          className={cx(
            "planet1",
            "planet1_night",
            !hasMounted ? "unmounted" : isNightMode ? "on" : "off",
          )}
        >
          <MoonSvg />
        </div>
      )}
    </div>
  );
};

export default React.memo(Galaxy);
