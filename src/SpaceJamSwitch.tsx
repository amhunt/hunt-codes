import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { MusicIcon } from "lucide-react";

import SceneSwitch from "ui/SceneSwitch";
import useWindowSize from "useWindowSize";
import MusicMutedIcon from "ui/MusicMutedIcon";
import { audioPrefs } from "./audioPrefs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_DELAY_MS,
} from "ui/tooltip";

/**
 * The bottom-left music switch: the site's one audio control. The thumb
 * carries a note while the jams play and a red-slashed one while they're
 * muted; hovering (or focusing) it shows what a flip would do — "Play
 * space jams" or "Pause space jams".
 *
 * It governs the whole audio layer, not just the track: it writes
 * `audioPrefs.enabled`, which the interaction sounds (sfx.ts) check
 * before they make a noise. A visitor who mutes the site should not still
 * hear it click at them.
 *
 * It starts **on**, so the site has a voice on arrival — which means the
 * switch now shows the visitor's intent rather than what is provably
 * audible. Autoplay policy refuses a cold `play()` with no gesture behind
 * it, so on a fresh load the track is armed but silent until the first
 * interaction, which the effect below waits for. The alternative — a
 * switch that flips itself off a beat after load because the browser said
 * no — reads as broken.
 *
 * Nothing here follows the element's own play/pause events any more: the
 * tab going away pauses the track (App.tsx) and coming back resumes it,
 * and neither is the visitor changing their mind about wanting music.
 *
 * Phones only show the switch on /projects-and-toys; elsewhere it's
 * hidden with CSS rather than unmounted, so a track playing there keeps
 * playing across the rest of the site.
 */
const SpaceJamSwitch = () => {
  const [enabled, setEnabled] = useState(audioPrefs.enabled);
  const audioRef = useRef<HTMLAudioElement>(null);
  const { pathname } = useLocation();
  const size = useWindowSize();
  const hiddenOnPhone = size === "sm" && pathname !== "/projects-and-toys";

  useEffect(() => {
    audioPrefs.enabled = enabled;
    const audio = audioRef.current;
    if (!audio) return;
    if (!enabled) {
      audio.pause();
      return;
    }
    // Try straight away — a flip of the switch is itself the gesture
    // autoplay policy wants, so this is only refused on a cold load.
    // Then wait out the first interaction and try once more, whatever
    // that interaction happened to be.
    const play = () => void audio.play().catch(() => {});
    play();
    document.addEventListener("pointerdown", play, { once: true });
    document.addEventListener("keydown", play, { once: true });
    return () => {
      document.removeEventListener("pointerdown", play);
      document.removeEventListener("keydown", play);
    };
  }, [enabled]);

  return (
    <>
      <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
        <Tooltip disableHoverableContent>
          {/* The switch is the trigger itself (no wrapper), so the
              tooltip's aria-describedby lands on the button. Radix's
              trigger overwrites the root's data-state with its own
              open/closed one — the App.scss styles read aria-checked. */}
          <TooltipTrigger asChild>
            <SceneSwitch
              // music-toggle: hook for the video-mode / rocket-journey
              // hiding rules and the bottom-left placement (App.scss)
              className={cx(
                "music-toggle space-jam-switch fixed bottom-4 left-4 z-5000",
                hiddenOnPhone && "music-toggle-hidden",
              )}
              checked={enabled}
              onCheckedChange={setEnabled}
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
          <TooltipContent>
            <p>{enabled ? "Pause space jams" : "Play space jams"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      <audio ref={audioRef} loop>
        <source src="/analog.m4a" type="audio/mp4" />
      </audio>
    </>
  );
};

export default SpaceJamSwitch;
