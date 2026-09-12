import React from "react";
import { Link } from "react-router-dom";
import cx from "classnames";
import { ArrowLeftCircleIcon } from "lucide-react";

/**
 * The corner "back" link every page but the landing carries: a small star
 * glyph and a word, pointing home.
 *
 * The corner slot itself stays the caller's: `.homePageBackLink`,
 * `.svg-generator-back-link` and `.svg3d-back-link` place it differently
 * (App.scss), and /about's fades with the résumé panel. What's shared is
 * the inside — the icon sizing, the gap, and the icon being `aria-hidden`
 * so the link reads as its own word rather than "circle arrow Home".
 *
 * Not this: /about's big sticky 40px arrow, the 404's bare sentence, and
 * the synth's Back-to-Earth *button* (it fires the warp ride rather than
 * navigating) are their own things.
 */
export const BackLink = ({
  to = "/home",
  label = "Home",
  icon: Icon = ArrowLeftCircleIcon,
  className,
}: {
  to?: string;
  label?: string;
  /** Defaults to the arrow; the two tool pages use a sun instead */
  icon?: React.ComponentType<{
    className?: string;
    size?: number;
    "aria-hidden"?: boolean | "true";
  }>;
  /** Extra classes on the link — spacing and hover belong to the slot */
  className?: string;
}) => (
  <Link className={cx("flex items-center gap-1", className)} to={to}>
    <Icon aria-hidden="true" className="starIcon" size={16} />
    <span>{label}</span>
  </Link>
);
