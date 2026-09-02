import React, { useEffect } from "react";
import { X } from "react-feather";

/**
 * The Zip brand-redesign launch reel in a ~80vw popover, shared by the
 * moon's video link and the résumé's work-sample card on /about
 * (ZipVideoMoon) and the satellite's screen on /projects-and-toys.
 * While mounted, `video-mode` on <body> hides everything but the stars
 * behind it (App.scss); the pages hide their own panels via the `open`
 * state they own. Escape, the close button and a click on the backdrop
 * all close it.
 */
const ZipVideoPopover = ({ onClose }: { onClose: () => void }) => {
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
        <video src="/zip-brand-launch.mp4" controls autoPlay playsInline />
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
