import React from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { GlobeIcon, StarIcon } from "lucide-react";

import useWindowSize from "useWindowSize";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_DELAY_MS,
} from "ui/tooltip";

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
 * Two glyphs side by side rather than a lone pill, so it's plain a
 * second view exists: a gold star for space, a silver wire globe for
 * mesh, both inked with the same black stroke. The names live in the
 * buttons' labels and the tooltips. The segments are buttons rather than
 * a Radix switch — a switch announces itself as on/off, which is the
 * wrong shape for two named views.
 *
 * Shown on the landing page at every size. Elsewhere phones sit it out
 * (a corner too crowded to spare), as does /home below lg; when it comes
 * back it fades in a beat after the camera swoop starts (the .vms-hidden
 * transition in App.scss carries the delay).
 */
/** The one stroke both glyphs share */
const GLYPH_STROKE = "#000";
const GLYPH_STROKE_WIDTH = 1.5;
const STAR_FILL = "#ffd23f";
const GLOBE_FILL = "#c9ccd6";

const VIEWS: {
  isSpace: boolean;
  name: string;
  Icon: typeof StarIcon;
  fill: string;
}[] = [
  { isSpace: true, name: "Boring Space", Icon: StarIcon, fill: STAR_FILL },
  { isSpace: false, name: "3D Disco Space", Icon: GlobeIcon, fill: GLOBE_FILL },
];

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
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        {VIEWS.map(({ isSpace, name, Icon, fill }) => (
          <Tooltip key={name} disableHoverableContent>
            <TooltipTrigger asChild>
              <button
                type="button"
                className="vms-option"
                aria-label={name}
                aria-pressed={isSpaceView === isSpace}
                onClick={() => onChange(isSpace)}
              >
                <Icon
                  size={18}
                  fill={fill}
                  stroke={GLYPH_STROKE}
                  strokeWidth={GLYPH_STROKE_WIDTH}
                  aria-hidden
                />
              </button>
            </TooltipTrigger>
            <TooltipContent>
              <p>{name}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </TooltipProvider>
    </div>
  );
};

export default ViewModeSwitch;
