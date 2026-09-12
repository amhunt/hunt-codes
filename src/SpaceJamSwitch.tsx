import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import cx from "classnames";
import { MusicIcon } from "lucide-react";

import SceneSwitch from "ui/SceneSwitch";
import useWindowSize from "useWindowSize";
import MusicMutedIcon from "ui/MusicMutedIcon";
import { audioPrefs } from "./audioPrefs";
import { setPadEnabled } from "./ambientPad";
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
 * It governs the whole audio layer: the generative pad the solar scene
 * plays (ambientPad.ts) and, through `audioPrefs.enabled`, the
 * interaction sounds (sfx.ts). A visitor who mutes the site should not
 * still hear it click at them.
 *
 * It starts **on**, so the site has a voice on arrival — which means the
 * switch shows the visitor's intent rather than what is provably audible.
 * Autoplay policy won't let a context make sound until the visitor has
 * touched something, so on a fresh load the pad is armed but silent until
 * the first interaction (ambientPad waits for it). The alternative — a
 * switch that flips itself off a beat after load because the browser said
 * no — reads as broken.
 *
 * Phones only show the switch on /projects-and-toys; elsewhere it's
 * hidden with CSS rather than unmounted, so audio started there keeps
 * playing across the rest of the site.
 */
const SpaceJamSwitch = () => {
  const [enabled, setEnabled] = useState(audioPrefs.enabled);
  const { pathname } = useLocation();
  const size = useWindowSize();
  const hiddenOnPhone = size === "sm" && pathname !== "/projects-and-toys";

  useEffect(() => {
    audioPrefs.enabled = enabled;
    setPadEnabled(enabled);
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
    </>
  );
};

export default SpaceJamSwitch;
