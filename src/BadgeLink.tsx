import React, { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { fireBadgeConfetti, preloadBadgeConfetti } from "./badgeConfetti";
import { badgeHoverState } from "./badgeState";
import useReducedMotion from "./useReducedMotion";

/**
 * The DOM hit target for the corner "hunt.codes" medallion (the coin
 * itself is drawn by space3d/BadgeMedallion in the star canvas, which
 * never takes pointer input). Hovering perks the coin up (BadgeMedallion
 * reads badgeHoverState per frame) and clicking fires a volley of
 * signature confetti from it (badgeConfetti). Everywhere but the landing
 * page the coin also doubles as the site's wordmark: clicking it flies
 * you back to the solar system. On the landing page you're already
 * there, so it's a plain button and the confetti is the whole show —
 * which means under prefers-reduced-motion (no confetti) the landing coin
 * goes back to being decorative rather than a button that does nothing.
 */
const BadgeLink = ({ isNightMode }: { isNightMode: boolean }) => {
  const { pathname } = useLocation();
  const reducedMotion = useReducedMotion();
  const isLanding = pathname === "/";
  // Day-mode /home: the Golden Gate Bridge owns the corner. The coin hides
  // in the same case (Space3DBackground) — an invisible hit target over
  // other content would hijack clicks.
  const visible =
    (isLanding && !reducedMotion) ||
    pathname === "/synth" ||
    pathname === "/journey" ||
    pathname === "/about" ||
    pathname.startsWith("/draw") ||
    pathname === "/shop" ||
    pathname === "/projects-and-toys" ||
    (pathname === "/home" && isNightMode);

  // The hit target can vanish without a pointerleave — flipping to day
  // mode on /home hides it, a route change swaps the element — so don't
  // leave the coin posed for a hover that ended when it comes back
  useEffect(() => {
    if (!visible) badgeHoverState.hovered = false;
    return () => {
      badgeHoverState.hovered = false;
    };
  }, [visible]);

  if (!visible) return null;

  // Launch from the coin's center (the coin fills the hit disc, centered)
  const fire = (target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    fireBadgeConfetti({
      x: (rect.left + rect.width / 2) / (window.innerWidth || 1),
      y: (rect.top + rect.height / 2) / (window.innerHeight || 1),
    });
  };
  const hoverProps = {
    onPointerEnter: () => {
      badgeHoverState.hovered = true;
      preloadBadgeConfetti();
    },
    onPointerLeave: () => {
      badgeHoverState.hovered = false;
    },
  };

  if (isLanding) {
    return (
      <button
        type="button"
        className="badge-link"
        aria-label="Fire the confetti"
        {...hoverProps}
        onClick={(e) => fire(e.currentTarget)}
      />
    );
  }

  return (
    <Link
      to="/"
      className="badge-link"
      aria-label="hunt.codes — back to the solar system"
      {...hoverProps}
      onClick={(e) => {
        fire(e.currentTarget);
        // Navigating away doesn't fire pointerleave — don't leave the
        // coin stuck in its hover state
        badgeHoverState.hovered = false;
      }}
    />
  );
};

export default BadgeLink;
