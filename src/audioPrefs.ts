/**
 * Whether the visitor wants to hear the site at all — written by the
 * bottom-left space-jam switch (SpaceJamSwitch), read by the interaction
 * sounds (sfx.ts). A plain mutable module rather than React state, like
 * badgeState and solarHover: the readers are frame loops and one-shot
 * click handlers, neither of which wants a re-render.
 *
 * The switch governs the whole audio layer, not just the music: flipping
 * it off has to silence the clicks and chimes too, or a visitor who muted
 * the site still hears it and reads that as a bug.
 *
 * Default off. A scene that starts singing at a visitor who didn't ask
 * is worse than one they never found had a soundtrack, so the switch
 * advertises itself with a tooltip a beat after load instead (see
 * SpaceJamSwitch) and waits to be asked.
 */
export const audioPrefs = { enabled: false };
