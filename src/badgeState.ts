/**
 * Hover and aim state for the corner "hunt.codes" medallion, shared
 * between the DOM link overlay (which owns pointer input) and the
 * in-canvas coin (which reads them per frame to perk up the spin and to
 * point its face at the confetti). Plain mutable module, same pattern as
 * solarHover — React state would drag the star canvas into render churn
 * at 60fps.
 */
export const badgeHoverState = {
  hovered: false,
};

/**
 * The confetti cannon's heading in degrees, screen-style (0 = right,
 * 90 = up): badgeConfetti fires the volley at it, and BadgeMedallion
 * turns the coin's face onto it first.
 */
export const BADGE_LAUNCH_ANGLE_DEG = 120;

/** How long the coin takes to swing its face onto that heading */
export const BADGE_AIM_MS = 250;

/**
 * Set from the moment a click stages a volley until the last one has
 * been fired: the coin holds its spin and points its face up the launch
 * heading, so the confetti reads as pouring out of the signature "A".
 */
export const badgeAimState = {
  aiming: false,
};
