import React from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";

import SceneSwitch from "ui/SceneSwitch";
import useWindowSize from "useWindowSize";

// Sun/moon mode switch, after the classic light/dark toggle design
// (dribbble.com/shots/14431115): a sky pill with drifting clouds and a
// glowing sun thumb by day; a starry navy pill with a cratered moon
// thumb by night. Checked = night. Hidden on the landing page; when the
// visitor enters /home it fades in a beat after the camera swoop starts
// (the .dns-hidden transition in App.scss carries the delay).
const DayNightSwitch = ({
  isNightMode,
  onCheckedChange,
}: {
  isNightMode: boolean;
  onCheckedChange: (isNight: boolean) => void;
}) => {
  const { pathname } = useLocation();
  const size = useWindowSize();
  const onLanding = pathname === "/";
  // /home below lg gives its corner back to the scene (part of the
  // small-screen declutter alongside the moon and link-trio bodies)
  const onNarrowHome = pathname === "/home" && size !== "lg";
  return (
    <SceneSwitch
      className={cx(
        "day-night-switch fixed right-12 top-4 z-[5000]",
        (onLanding || onNarrowHome) && "dns-hidden",
      )}
      checked={isNightMode}
      onCheckedChange={onCheckedChange}
      aria-label="Night mode"
      thumbClassName="dns-thumb"
      thumb={
        <>
          <span aria-hidden className="dns-crater dns-crater-1" />
          <span aria-hidden className="dns-crater dns-crater-2" />
          <span aria-hidden className="dns-crater dns-crater-3" />
        </>
      }
    >
      <span aria-hidden className="dns-scene dns-scene-day">
        <span className="dns-cloud dns-cloud-1" />
        <span className="dns-cloud dns-cloud-2" />
      </span>
      <span aria-hidden className="dns-scene dns-scene-night">
        <span className="dns-star dns-star-1" />
        <span className="dns-star dns-star-2" />
        <span className="dns-star dns-star-3" />
        <span className="dns-star dns-star-4" />
      </span>
    </SceneSwitch>
  );
};

export default DayNightSwitch;
