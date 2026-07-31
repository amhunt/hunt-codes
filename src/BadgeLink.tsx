import React from "react";
import { Link, useLocation } from "react-router-dom";

import { badgeHoverState } from "./badgeState";

/**
 * The DOM hit target for the corner "hunt.codes" medallion (the coin
 * itself is drawn by space3d/BadgeMedallion in the star canvas, which
 * never takes pointer input). Everywhere but the landing page the coin
 * doubles as the site's wordmark: clicking it flies you back to the
 * solar system. On the landing page it stays decorative — you're
 * already there.
 */
const BadgeLink = ({ isNightMode }: { isNightMode: boolean }) => {
  const { pathname } = useLocation();
  // Landing: decorative only (you're already home). /about and /draw:
  // page content flows over the corner. Day-mode /home: the Golden Gate
  // Bridge owns the corner. The coin hides in the same cases
  // (Space3DBackground) — an invisible link over other content would
  // hijack clicks.
  const visible =
    pathname === "/synth" ||
    pathname === "/journey" ||
    (pathname === "/home" && isNightMode);
  if (!visible) return null;

  return (
    <Link
      to="/"
      className="badge-link"
      aria-label="hunt.codes — back to the solar system"
      onPointerEnter={() => {
        badgeHoverState.hovered = true;
      }}
      onPointerLeave={() => {
        badgeHoverState.hovered = false;
      }}
      // Navigating away doesn't fire pointerleave — don't leave the coin
      // spinning fast forever
      onClick={() => {
        badgeHoverState.hovered = false;
      }}
    />
  );
};

export default BadgeLink;
