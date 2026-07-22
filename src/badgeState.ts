/**
 * Hover state for the corner "hunt.codes" medallion, shared between the
 * DOM link overlay (which owns pointer input) and the in-canvas coin
 * (which reads it per frame to perk up the spin). Plain mutable module,
 * same pattern as solarHover — React state would drag the star canvas
 * into render churn at 60fps.
 */
export const badgeHoverState = {
  hovered: false,
};
