// Shared behavior constants for the star field. Two renderers consume
// these: the WebGL points renderer (space3d/StarField) and the legacy DOM
// fallback (Stars.tsx / StarDot.tsx) — keep them here so the two paths
// can't drift apart.

export const DEFAULT_CURSOR_GRAVITY_RADIUS_PX = 120;

/** Does not limit size when immediately next to cursor */
export const maxStarRadiusPx = 6;

/** Stars within this distance of the cursor swell in size */
export const STAR_TO_CURSOR_TRIGGER_DISTANCE_PX = 100;

/** Cursor gravity is ignored within this margin of the viewport edge */
export const CURSOR_DISABLED_BUFFER_ZONE_PX = 20;

/** Spring-back acceleration factor (distance² multiplier) */
export const STAR_MOVEMENT_SPEED_MULTIPLIER = 1 / 100;

/** The sim was tuned against a 45ms tick; movement scales from this */
export const STAR_TICK_MS = 45;

/** Landing text stars sit scattered this long before assembling */
export const STAR_INTRO_DELAY_MS = 2000;

/** The star text advances phrases at this interval (3 times, then stops) */
export const TEXT_CHANGE_INTERVAL_MS = 10000;
