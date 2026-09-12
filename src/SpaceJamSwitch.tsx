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
 * The bottom-left music switch: the site's one audio control. It governs
 * the whole audio layer — the solar scene's generative pad
 * (ambientPad.ts) and, through `audioPrefs.enabled`, the interaction
 * sounds (sfx.ts). A visitor who mutes the site shouldn't still hear it
 * click at them.
 *
 * It starts **off** — sound that arrives uninvited is worse than sound
 * nobody found — so the switch advertises itself instead: a beat after
 * load the tooltip opens on its own, then gets out of the way. Flipping
 * it on is itself the gesture autoplay policy wants, so the pad comes up
 * immediately.
 *
 * Phones only show it on /projects-and-toys; elsewhere it's hidden with
 * CSS rather than unmounted, so audio started there keeps playing.
 */

/** The one-time advert. Swap the line here — nothing else reads it. */
const SOUND_HINT = "Sound on for the full experience";
/** The music isn't a track, and nobody would guess that from a speaker
 *  icon — so say what it is, once, and then never again. */
const SOUND_TOAST =
  "Sound on — the music is generated live from the scene: a chord for each view, and a chime whenever two planets line up.";
/** Long enough that the scene has assembled, short enough to still feel
 *  like a response to arriving */
const HINT_DELAY_MS = 2000;
/** How long it lingers before withdrawing on its own */
const HINT_LINGER_MS = 8000;

const SpaceJamSwitch = () => {
  const [enabled, setEnabled] = useState(audioPrefs.enabled);
  const [open, setOpen] = useState(false);
  /** Whether the tooltip is the advert rather than its usual label */
  const [hinting, setHinting] = useState(false);
  /** The advert gets one turn per page load, however it ends */
  const hintSpent = useRef(false);
  /** So does the explanation — flipping off and on isn't a request to be
   *  told again */
  const toastSpent = useRef(false);
  const { pathname } = useLocation();
  const size = useWindowSize();
  const hiddenOnPhone = size === "sm" && pathname !== "/projects-and-toys";

  useEffect(() => {
    audioPrefs.enabled = enabled;
    setPadEnabled(enabled);
  }, [enabled]);

  // Nothing to advertise to someone who already switched it on, or on a
  // phone where the switch isn't on screen
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

  /** Any hover or focus ends the advert and hands the tooltip back to
   *  its usual job, mid-appearance if need be. */
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
      {/* The switch is the trigger itself, so aria-describedby lands on
          the button. Radix's trigger overwrites data-state with its own
          open/closed, so the App.scss styles read aria-checked. */}
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
      {/* A sentence rather than two words, so it takes the padding the
          thin hover pill does without */}
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
