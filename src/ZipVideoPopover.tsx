import React, { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
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
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;
  const close = useCallback(() => onCloseRef.current(), []);

  // Closing mid-reel fires no pause event, so unmount restores the pad
  // itself. Its own effect, with no deps: the one below re-runs whenever
  // `onClose` changes identity, and must not un-duck a reel still playing.
  useEffect(() => () => setPadDucked(false), []);

  useLayoutEffect(() => {
    returnFocusRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;
    document.body.classList.add("video-mode");

    // The dialog is portalled directly to <body>. Make every sibling inert
    // so neither pointer nor keyboard users can reach the page underneath.
    const layer = dialogRef.current?.parentElement;
    const background = Array.from(document.body.children).filter(
      (element): element is HTMLElement =>
        element instanceof HTMLElement && element !== layer,
    );
    const previousState = background.map((element) => ({
      element,
      inert: element.inert,
      ariaHidden: element.getAttribute("aria-hidden"),
    }));
    for (const { element } of previousState) {
      element.inert = true;
      element.setAttribute("aria-hidden", "true");
    }

    const video = videoRef.current;
    closeRef.current?.focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        close();
        return;
      }
      if (e.key !== "Tab") return;

      const focusable = Array.from(
        dialogRef.current?.querySelectorAll<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), video[controls], [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        e.preventDefault();
        return;
      }
      const first = focusable[0];
      const last = focusable.at(-1)!;
      if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      } else if (!dialogRef.current?.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      video?.pause();
      document.body.classList.remove("video-mode");
      document.removeEventListener("keydown", onKeyDown);
      for (const { element, inert, ariaHidden } of previousState) {
        element.inert = inert;
        if (ariaHidden === null) element.removeAttribute("aria-hidden");
        else element.setAttribute("aria-hidden", ariaHidden);
      }
      returnFocusRef.current?.focus();
    };
  }, [close]);

  return createPortal(
    <div
      className="zip-video-layer"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div
        ref={dialogRef}
        className="zip-video-popover"
        role="dialog"
        aria-modal="true"
        aria-labelledby="zip-video-title"
        aria-describedby="zip-video-caption zip-video-description"
      >
        <h2 id="zip-video-title" className="sr-only">
          Zip brand launch video
        </h2>
        <button
          ref={closeRef}
          type="button"
          className="zip-video-close"
          aria-label="Close video"
          onClick={close}
        >
          <X size={28} aria-hidden="true" />
        </button>
        {/* `pause` also fires when the reel reaches its end */}
        <video
          ref={videoRef}
          src="/zip-brand-launch.mp4"
          controls
          playsInline
          onPlay={() => setPadDucked(true)}
          onPause={() => setPadDucked(false)}
        />
        <p className="zip-video-caption">
          A promo video I made for the UI changes we shipped as part of
          Zip&rsquo;s brand redesign in 2023 — built in After Effects and
          Premiere.
        </p>
        <p id="zip-video-description" className="zip-video-description">
          Video description: a 66-second motion-graphics reel showcasing
          animated typography, Zip&rsquo;s updated colors and logo, purchase
          request forms, and a virtual card. The MP4 includes an audio track but
          no embedded or sidecar captions.
        </p>
      </div>
    </div>,
    document.body,
  );
};

export default ZipVideoPopover;
