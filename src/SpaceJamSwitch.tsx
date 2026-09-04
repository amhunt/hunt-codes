import React, { useEffect, useRef, useState } from "react";
import { Volume2Icon } from "lucide-react";

import SceneSwitch from "ui/SceneSwitch";
import SpeakerMutedIcon from "ui/SpeakerMutedIcon";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
  TOOLTIP_DELAY_MS,
} from "ui/tooltip";

/**
 * The bottom-left music switch: flips the site's background music on and
 * off. The thumb carries a speaker while the jams play and a red-slashed
 * one while they're muted; hovering (or focusing) it shows what a flip
 * would do — "Play space jams" or "Pause space jams".
 *
 * The <audio> only mounts on the first flip on — that click is the user
 * gesture autoplay policies want, and it keeps the track from loading for
 * visitors who never ask for it. After that it stays mounted, so flipping
 * off pauses and on resumes where it left off rather than restarting.
 * `playing` also follows the element's own play/pause events, so a pause
 * from elsewhere (App.tsx pauses it while the tab is hidden) or a refused
 * play() leaves the switch honest about what's audible.
 */
const SpaceJamSwitch = () => {
  const [mounted, setMounted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Runs after the first flip mounts the element, then on every flip
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
  }, [playing]);

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
              className="music-toggle space-jam-switch fixed bottom-4 left-4 z-5000"
              checked={playing}
              onCheckedChange={(on) => {
                setMounted(true);
                setPlaying(on);
              }}
              // A stable name — aria-checked carries the state, and the
              // tooltip names the flip
              aria-label="Space jams"
              thumbClassName="sjs-thumb"
              thumb={
                <>
                  <Volume2Icon size={16} className="sjs-icon-on" />
                  <SpeakerMutedIcon size={16} className="sjs-icon-off" />
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
            <p>{playing ? "Pause space jams" : "Play space jams"}</p>
          </TooltipContent>
        </Tooltip>
      </TooltipProvider>
      {mounted && (
        <audio
          ref={audioRef}
          loop
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
        >
          <source src="/analog.m4a" type="audio/mp4" />
        </audio>
      )}
    </>
  );
};

export default SpaceJamSwitch;
