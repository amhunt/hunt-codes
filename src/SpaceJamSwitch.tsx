import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { MusicIcon } from "lucide-react";
import toast from "react-hot-toast";

import SceneSwitch from "ui/SceneSwitch";
import useWindowSize from "useWindowSize";
import MusicMutedIcon from "ui/MusicMutedIcon";
import { audioPrefs } from "./audioPrefs";
import { setPadEnabled } from "./ambientPad";
import { Tooltip, TooltipContent, TooltipTrigger } from "ui/tooltip";

/**
 * The bottom-left music switch: the site's one audio control. The thumb
 * carries a note while the jams play and a red-slashed one while they're
 * muted; hovering (or focusing) it shows what a flip would do — "Play
 * space jams" or "Pause space jams".
 *
 * It governs the whole audio layer: the generative pad the solar scene
 * plays (ambientPad.ts) and, through `audioPrefs.enabled`, the
 * interaction sounds (sfx.ts). A visitor who mutes the site should not
 * still hear it click at them.
 *
 * It starts **off** — sound that arrives uninvited is worse than sound
 * nobody found — so the switch advertises itself instead: a beat after
 * load the tooltip opens on its own to say there is something to hear,
 * then gets out of the way. Flipping it on is itself the gesture autoplay
 * policy wants, so the pad comes up immediately rather than waiting.
 *
 * Phones only show the switch on /projects-and-toys; elsewhere it's
 * hidden with CSS rather than unmounted, so audio started there keeps
 * playing across the rest of the site.
 */

/** The one-time advert. Swap the line here — nothing else reads it. */
const SOUND_HINT = "Sound on for the full experience";
/**
 * What the visitor gets told the first time they switch it on. The music
 * isn't a track, and nobody would guess that from a speaker icon — so say
 * what it actually is, once, and then never again.
 */
const SOUND_TOAST =
  "Sound on — the music is generated live from the scene: a chord for each view, and a chime whenever two planets line up.";
/** Long enough after load that the scene has assembled and the visitor
 *  is looking at it, short enough to still feel like a response to
 *  arriving */
const HINT_DELAY_MS = 2000;
/** How long it lingers before withdrawing on its own */
const HINT_LINGER_MS = 8000;

const SpaceJamSwitch = () => {
  const [enabled, setEnabled] = useState(audioPrefs.enabled);
  const [open, setOpen] = useState(false);
  /** Whether the tooltip is currently the advert rather than its usual
   *  "here is what a flip would do" label */
  const [hinting, setHinting] = useState(false);
  /** The advert gets one turn per page load, however it ends */
  const hintSpent = useRef(false);
  /** So does the explanation — flipping off and back on is not a request
   *  to be told again */
  const toastSpent = useRef(false);
  const { pathname } = useLocation();
  const size = useWindowSize();
  const hiddenOnPhone = size === "sm" && pathname !== "/projects-and-toys";

  useEffect(() => {
    audioPrefs.enabled = enabled;
    setPadEnabled(enabled);
  }, [enabled]);

  // Nothing to advertise to someone who already switched it on, or on a
  // phone where the switch isn't on screen to point at
  useEffect(() => {
    if (hintSpent.current || enabled || hiddenOnPhone) return;
    const timer = setTimeout(() => {
      hintSpent.current = true;
      setHinting(true);
      setOpen(true);
    }, HINT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [enabled, hiddenOnPhone]);

  useEffect(() => {
    if (!hinting) return;
    const timer = setTimeout(() => {
      setHinting(false);
      setOpen(false);
    }, HINT_LINGER_MS);
    return () => clearTimeout(timer);
  }, [hinting]);

  /** Any hover or focus of the switch ends the advert and hands the
   *  tooltip back to its usual job, mid-appearance if need be. */
  const handleOpenChange = (next: boolean) => {
    setHinting(false);
    setOpen(next);
  };

  return (
    <Tooltip
      disableHoverableContent
      open={open}
      onOpenChange={handleOpenChange}
    >
      {/* The switch is the trigger itself (no wrapper), so the
          tooltip's aria-describedby lands on the button. Radix's trigger
          overwrites the root's data-state with its own open/closed one —
          the App.scss styles read aria-checked. */}
      <TooltipTrigger asChild>
        <SceneSwitch
          // music-toggle: hook for the video-mode / rocket-journey
          // hiding rules and the bottom-left placement (App.scss)
          className={cx(
            "music-toggle space-jam-switch fixed bottom-4 left-4 z-5000",
            hiddenOnPhone && "music-toggle-hidden",
          )}
          checked={enabled}
          onCheckedChange={(on) => {
            setHinting(false);
            setOpen(false);
            setEnabled(on);
            if (on && !toastSpent.current) {
              toastSpent.current = true;
              toast(SOUND_TOAST);
            }
          }}
          // A stable name — aria-checked carries the state, and the
          // tooltip names the flip
          aria-label="Space jams"
          thumbClassName="sjs-thumb"
          thumb={
            <>
              <MusicIcon size={16} className="sjs-icon-on" />
              <MusicMutedIcon size={16} className="sjs-icon-off" />
            </>
          }
        >
          <span aria-hidden className="sjs-scene sjs-scene-on">
            <span className="sjs-bar" />
            <span className="sjs-bar" />
            <span className="sjs-bar" />
            <span className="sjs-bar" />
          </span>
          <span aria-hidden className="sjs-scene sjs-scene-off" />
        </SceneSwitch>
      </TooltipTrigger>
      {/* The advert is a sentence rather than two words, so it takes
          the vertical padding the thin hover pill does without */}
      <TooltipContent side="top" className={hinting ? "py-1" : undefined}>
        <p>
          {hinting
            ? SOUND_HINT
            : enabled
              ? "Pause space jams"
              : "Play space jams"}
        </p>
      </TooltipContent>
    </Tooltip>
  );
};

export default SpaceJamSwitch;
