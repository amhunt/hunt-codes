import React, { useMemo, memo } from "react";
import cx from "classnames";

export interface StarT {
  x: number;
  y: number;
  r: number;
  canvasX: number;
  canvasY: number;
  // animationDelay: string;
  isText?: boolean;
  color: string;
  distanceToCursor?: number;
}

const STAR_TO_CURSOR_TRIGGER_DISTANCE_PX = 100;

interface Props {
  star: StarT;
  areAllStarsCollected: boolean;
}

function StarDot({ star, areAllStarsCollected }: Props) {
  let starWidth = star.r;
  if (
    star.distanceToCursor != null &&
    star.distanceToCursor < STAR_TO_CURSOR_TRIGGER_DISTANCE_PX
  ) {
    starWidth =
      (Math.sqrt(STAR_TO_CURSOR_TRIGGER_DISTANCE_PX) /
        Math.sqrt(star.distanceToCursor)) *
      star.r;
  }
  if (starWidth > 8) {
    starWidth = 8;
  }
  const style = useMemo(
    () => ({
      left: star.x,
      top: star.y,
      width: starWidth,
      height: starWidth,
      // animationDelay: star.animationDelay,
      backgroundColor: areAllStarsCollected ? "#00ff00 !important" : star.color,
    }),
    [
      star.x,
      star.y,
      // star.animationDelay,
      star.color,
      starWidth,
      areAllStarsCollected,
    ]
  );
  return (
    <div
      className={cx(
        "star",
        star.isText ? "star_text" : "star_background",
        !star.isText && star.r < 1.05 && "star_disco"
      )}
      style={style}
    />
  );
}

export default memo(StarDot);
