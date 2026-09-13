import React, { useCallback, useEffect, useRef } from "react";
import { X } from "react-feather";
import {
  Modal,
  ModalClose,
  ModalContent,
  ModalDescription,
  ModalTitle,
} from "ui/Modal";
import { setPadDucked } from "./ambientPad";

/** Shared launch reel. Modal owns dialog interactions; this component owns
 * playback, ambient audio, and the starfield presentation while open. */
const ZipVideoPopover = ({ onClose }: { onClose: () => void }) => {
  const closeRef = useRef<HTMLButtonElement>(null);
  const attachVideo = useCallback((video: HTMLVideoElement | null) => {
    return () => video?.pause();
  }, []);

  useEffect(() => {
    document.body.classList.add("video-mode");
    return () => {
      setPadDucked(false);
      document.body.classList.remove("video-mode");
    };
  }, []);

  return (
    <Modal open onOpenChange={(open) => !open && onClose()}>
      <ModalContent
        overlayClassName="zip-video-layer"
        className="zip-video-popover"
        initialFocusRef={closeRef}
      >
        <ModalTitle className="sr-only">Zip brand launch video</ModalTitle>
        <ModalClose asChild>
          <button
            ref={closeRef}
            type="button"
            className="zip-video-close"
            aria-label="Close video"
          >
            <X size={28} aria-hidden="true" />
          </button>
        </ModalClose>
        <video
          ref={attachVideo}
          src="/zip-brand-launch.mp4"
          controls
          playsInline
          onPlay={() => setPadDucked(true)}
          onPause={() => setPadDucked(false)}
        />
        <ModalDescription asChild>
          <div>
            <p className="zip-video-caption">
              A promo video I made for the UI changes we shipped as part of
              Zip&rsquo;s brand redesign in 2023 — built in After Effects and
              Premiere.
            </p>
            <p className="zip-video-description">
              Video description: a 66-second motion-graphics reel showcasing
              animated typography, Zip&rsquo;s updated colors and logo, purchase
              request forms, and a virtual card. The MP4 includes an audio track
              but no embedded or sidecar captions.
            </p>
          </div>
        </ModalDescription>
      </ModalContent>
    </Modal>
  );
};

export default ZipVideoPopover;
