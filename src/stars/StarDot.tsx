import React, { memo } from "react";
import cx from "classnames";

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
}

function StarDot({ star, as = "circle" }: Props) {
  let starWidth = star.r;
  if (
    star.distanceToCursor != null &&
    star.distanceToCursor < STAR_TO_CURSOR_TRIGGER_DISTANCE_PX
  ) {
    starWidth =
      (STAR_TO_CURSOR_TRIGGER_DISTANCE_PX_SQ_ROOT /
        Math.sqrt(star.distanceToCursor)) *
      star.r;
  }
  if (starWidth > 6) {
    starWidth = 6;
  }

  const className = cx(
    "star",
    star.isText ? "star_text" : "star_background",
    !star.isText && star.r < 1.05 && "star_disco"
  );
  if (as === "circle") {
    return (
      <circle
        className={className}
        cx={star.x}
        cy={star.y}
        r={starWidth}
        fill={star.color}
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
        backgroundColor: star.color,
      }}
      className={className}
    />
  );
}

export default memo(StarDot);
