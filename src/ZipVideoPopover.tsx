import React, { useEffect } from "react";
import { X } from "react-feather";

import { setPadDucked } from "./ambientPad";

/**
 * The Zip brand-redesign launch reel in a ~80vw popover, shared by the
 * moon's video link and the résumé's work-sample card on /about
 * (ZipVideoMoon) and the satellite's screen on /projects-and-toys.
 * While mounted, `video-mode` on <body> hides everything but the stars
 * behind it (App.scss); the pages hide their own panels via the `open`
 * state they own. Escape, the close button and a click on the backdrop
 * all close it.
 *
 * The reel has its own soundtrack, so the space jams stand down while it
 * plays (`setPadDucked`) and come back when it pauses, ends, or the
 * popover closes — bound to the video's own play state rather than the
 * popover's mount, so a reel that finishes while the caption is still
 * being read hands the room back.
 */
const ZipVideoPopover = ({ onClose }: { onClose: () => void }) => {
  // Closing mid-reel fires no pause event, so unmount restores the pad
  // itself. Its own effect, with no deps: the one below re-runs whenever
  // `onClose` changes identity, and must not un-duck a reel still playing.
  useEffect(() => () => setPadDucked(false), []);

  useEffect(() => {
    document.body.classList.add("video-mode");
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.classList.remove("video-mode");
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [onClose]);

  return (
    <div className="zip-video-layer" onClick={onClose}>
      <div className="zip-video-popover" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          className="zip-video-close"
          aria-label="Close video"
          onClick={onClose}
        >
          <X size={28} />
        </button>
        {/* The click that opened the popover is the user gesture that
            allows autoplay with sound */}
        {/* `pause` also fires when the reel reaches its end */}
        <video
          src="/zip-brand-launch.mp4"
          controls
          autoPlay
          playsInline
          onPlay={() => setPadDucked(true)}
          onPause={() => setPadDucked(false)}
        />
        <p className="zip-video-caption">
          A promo video I made for the UI changes we shipped as part of
          Zip&rsquo;s brand redesign in 2023 — built in After Effects and
          Premiere.
        </p>
      </div>
    </div>
  );
};

export default ZipVideoPopover;
