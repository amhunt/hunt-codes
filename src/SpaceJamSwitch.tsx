import React, { useEffect, useRef, useState } from "react";
import { Volume2Icon } from "lucide-react";

import SceneSwitch from "ui/SceneSwitch";
import SpeakerMutedIcon from "ui/SpeakerMutedIcon";

/**
 * The bottom-left "Space jam" pill: a label and a switch that flips the
 * site's background music on and off. The thumb carries a speaker while
 * the jams play and a red-slashed one while they're muted.
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
      {/* The <label> makes the text a click target too; Radix's switch is
          a <button>, a labelable element, so it takes the accessible name
          "Space jam" from here (the icons are aria-hidden) */}
      <label
        // music-toggle: hook for the video-mode / rocket-journey hiding
        // rules and the bottom-left placement (App.scss)
        className="music-toggle fixed bottom-4 left-4 z-5000 flex items-center gap-2"
      >
        <span>Space jam</span>
        <SceneSwitch
          className="space-jam-switch"
          checked={playing}
          onCheckedChange={(on) => {
            setMounted(true);
            setPlaying(on);
          }}
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
      </label>
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
