import { createLucideIcon } from "lucide-react";

/**
 * A speaker with a red slash through it — the space-jam switch's muted
 * thumb. lucide's own `VolumeOff` breaks the speaker and its waves around
 * the slash, which turns to mush at 16px inside a 26px thumb; this keeps
 * lucide's plain `Volume` speaker whole and lays one diagonal over it.
 * The slash carries its own class so App.scss (`.speaker-slash`) can
 * paint it red while the speaker takes the thumb's text colour.
 */
const SpeakerMutedIcon = createLucideIcon("speaker-muted", [
  [
    "path",
    {
      d: "M11 4.702a.705.705 0 0 0-1.203-.498L6.413 7.587A1.4 1.4 0 0 1 5.416 8H3a1 1 0 0 0-1 1v6a1 1 0 0 0 1 1h2.416a1.4 1.4 0 0 1 .997.413l3.383 3.384A.705.705 0 0 0 11 19.298z",
      key: "speaker",
    },
  ],
  ["path", { d: "m3 3 18 18", className: "speaker-slash", key: "slash" }],
]);

export default SpeakerMutedIcon;
