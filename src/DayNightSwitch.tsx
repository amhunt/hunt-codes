import React from "react";
import * as Switch from "@radix-ui/react-switch";
import { useLocation } from "react-router-dom";
import cx from "classnames";

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
  const onLanding = pathname === "/";
  return (
    <Switch.Root
      className={cx(
        "day-night-switch fixed right-12 top-4 z-[5000]",
        onLanding && "dns-hidden",
      )}
      checked={isNightMode}
      onCheckedChange={onCheckedChange}
      aria-label={isNightMode ? "Switch to day mode" : "Switch to night mode"}
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
      <Switch.Thumb className="dns-thumb">
        <span aria-hidden className="dns-crater dns-crater-1" />
        <span aria-hidden className="dns-crater dns-crater-2" />
        <span aria-hidden className="dns-crater dns-crater-3" />
      </Switch.Thumb>
    </Switch.Root>
  );
};

export default DayNightSwitch;
