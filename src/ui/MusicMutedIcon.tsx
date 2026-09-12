import { createLucideIcon } from "lucide-react";

/**
 * lucide's beamed `Music` pair with a red slash through it — the
 * space-jam switch's muted thumb, the counterpart to the plain note it
 * shows while the jams play.
 *
 * Built the same way the speaker version before it was: keep the glyph
 * whole and lay one diagonal over it, rather than breaking the notes
 * around the slash the way lucide's own "off" icons do — at 16px inside a
 * 26px thumb a broken glyph turns to mush. The slash carries its own
 * class so App.scss (`.audio-slash`) can paint it red while the notes
 * take the thumb's text colour.
 */
const MusicMutedIcon = createLucideIcon("music-muted", [
  ["path", { d: "M9 18V5l12-2v13", key: "beam" }],
  ["circle", { cx: "6", cy: "18", r: "3", key: "note-low" }],
  ["circle", { cx: "18", cy: "16", r: "3", key: "note-high" }],
  ["path", { d: "m3 3 18 18", className: "audio-slash", key: "slash" }],
]);

export default MusicMutedIcon;
