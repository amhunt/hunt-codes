import React, { memo } from "react";
import cx from "classnames";
import tinycolor from "tinycolor2";
import { maxStarRadiusPx } from "./starUtils";

export interface StarT {
  x: number;
  y: number;
  r: number;
  canvasX: number;
  canvasY: number;
  isText?: boolean;
  color: string;
  distanceToCursor?: number;
}

const STAR_TO_CURSOR_TRIGGER_DISTANCE_PX = 100;
const STAR_TO_CURSOR_TRIGGER_DISTANCE_PX_SQ_ROOT = Math.sqrt(
  STAR_TO_CURSOR_TRIGGER_DISTANCE_PX
);

interface Props {
  star: StarT;
  as?: "circle" | "div";
  numCloseToCursor?: number;
}

function StarDot({ star, as = "circle", numCloseToCursor }: Props) {
  let starWidth = star.r;
  if (star.distanceToCursor != null) {
    if (star.distanceToCursor < STAR_TO_CURSOR_TRIGGER_DISTANCE_PX) {
      starWidth =
        (STAR_TO_CURSOR_TRIGGER_DISTANCE_PX_SQ_ROOT /
          Math.sqrt(star.distanceToCursor)) *
        star.r;
      // Max of 6px radius, unless right next to cursor
      starWidth = Math.min(starWidth, maxStarRadiusPx);

      // if right next to cursor, make it as big as the number of stars close to cursor
      if (numCloseToCursor != null && star.distanceToCursor < 10) {
        starWidth = Math.max(starWidth, Math.min(numCloseToCursor / 16, 32));
      }
    }
  }

  const className = cx(
    "star",
    star.isText ? "star_text" : "star_background",
    !star.isText && star.r < 1.05 && "star_disco"
  );

  const color = tinycolor(star.color)
    .brighten(
      star.distanceToCursor != null && star.distanceToCursor < 10
        ? (numCloseToCursor ?? 0)
        : 0
    )
    .toHexString();
  if (as === "circle") {
    return (
      <circle
        className={className}
        cx={star.x}
        cy={star.y}
        r={starWidth}
        fill={color}
      />
    );
  }
  return (
    <div
      style={{
        left: star.x,
        top: star.y,
        width: starWidth,
        height: starWidth,
        backgroundColor: color,
      }}
      className={className}
    />
  );
}

export default memo(StarDot);
