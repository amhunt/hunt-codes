import React from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { GlobeIcon, StarIcon } from "lucide-react";

import useWindowSize from "useWindowSize";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

/**
 * The scene's view switch, borrowed from the layer chip every maps app
 * puts in a corner: **Space** is the photographed solar system, **Mesh**
 * redraws every body as a glowing blue-white lattice. ("Space" rather
 * than "Satellite" — the scene already has a satellite in it, Sputnik.)
 *
 * Two glyphs side by side rather than a lone pill, so it's plain a
 * second view exists; the names live in the labels and tooltips. Buttons
 * rather than a Radix switch, which would announce itself as on/off —
 * the wrong shape for two named views.
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
  // Off the landing, phones and narrow /home give the corner back to the
  // scene (the same small-screen declutter as the moon and link bodies).
  // The landing keeps it at every size — it's where a visitor is invited
  // to play with the scene.
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
    </div>
  );
};

export default ViewModeSwitch;
