import React from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { GlobeIcon, StarIcon } from "lucide-react";

import useWindowSize from "useWindowSize";

/**
 * The scene's view switch, borrowed from the layer chip every maps app
 * puts in a corner: **Space** is the photographed solar system — Blue
 * Marble Earth, a cratered moon, a churning gold sun — and **Mesh**
 * redraws every body in the scene as a glowing blue-white lattice.
 *
 * ("Space" rather than "Satellite", which the maps metaphor would have
 * suggested: this scene already has a satellite in it — Sputnik, the
 * /projects-and-toys link — so the word was spoken for.)
 *
 * Both words stay visible rather than hiding behind an icon: the two
 * views are equals, and a lone pill gives no hint that a second one
 * exists. The segments are buttons rather than a Radix switch — a switch
 * announces itself as on/off, which is the wrong shape for two named
 * views.
 *
 * Shown on the landing page at every size. Elsewhere phones sit it out
 * (a corner too crowded to spare), as does /home below lg; when it comes
 * back it fades in a beat after the camera swoop starts (the .vms-hidden
 * transition in App.scss carries the delay).
 */
const ViewModeSwitch = ({
  isSpaceView,
  onChange,
}: {
  isSpaceView: boolean;
  onChange: (isSpace: boolean) => void;
}) => {
  const { pathname } = useLocation();
  const size = useWindowSize();
  const onLanding = pathname === "/";
  // Off the landing page, phones sit the switch out (space stays the
  // default), and /home below lg gives its corner back to the scene too
  // (part of the small-screen declutter alongside the moon and link-trio
  // bodies). The landing page keeps it at every size — it's the one
  // place a visitor is invited to play with the scene.
  const onPhone = size === "sm";
  const onNarrowHome = pathname === "/home" && size !== "lg";
  return (
    <div
      role="group"
      aria-label="Scene view"
      className={cx(
        "view-mode-switch fixed right-12 top-4 z-[5000]",
        !onLanding && (onPhone || onNarrowHome) && "vms-hidden",
      )}
    >
      {/* The travelling highlight sits behind both labels, so the active
          one slides rather than blinking across */}
      <span
        aria-hidden
        className={cx("vms-indicator", !isSpaceView && "vms-indicator-end")}
      />
      <button
        type="button"
        className="vms-option"
        aria-pressed={isSpaceView}
        onClick={() => onChange(true)}
      >
        <StarIcon size={14} aria-hidden />
        Space
      </button>
      <button
        type="button"
        className="vms-option"
        aria-pressed={!isSpaceView}
        onClick={() => onChange(false)}
      >
        <GlobeIcon size={14} aria-hidden />
        Mesh
      </button>
    </div>
  );
};

export default ViewModeSwitch;
