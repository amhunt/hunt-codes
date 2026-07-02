import { useCallback, useEffect, useRef } from "react";

/**
 * Normalized scroll progress in [0, 1] for per-frame consumers (the WebGL
 * moon, which phases as you scroll). Returns a stable read function that
 * recomputes from the live DOM on every call — no React re-renders, same
 * spirit as useCursorPositionRef.
 *
 * Scroll events don't bubble, so we listen in the capture phase at the
 * document level: that catches scrolling on ANY element. This matters
 * because the pages that show the moon scroll an inner overflow container
 * (.resume-container), not the window itself.
 *
 * The listener only picks WHICH element is the page's scroller (ignoring
 * horizontal-only scrollers like an auto-scrolling text input, which
 * would otherwise hijack the phase); the progress itself is derived fresh
 * on each read. That keeps it correct when no event has fired yet and
 * when the scrolled container unmounts on a route change while the moon
 * stays up — a stale "scrolled to the bottom" crescent would otherwise
 * persist onto the next page.
 */
export const useScrollProgressRef = () => {
  const scrollerRef = useRef<Element | null>(null);

  useEffect(() => {
    const onScroll = (e: Event) => {
      const target = e.target;
      // Element scroll (the resume container) reports on the element;
      // window/document scroll reports on document -> use the root.
      const el =
        target instanceof Element && target !== document.scrollingElement
          ? target
          : document.scrollingElement;
      // Adopt only elements that actually scroll vertically
      if (el && el.scrollHeight - el.clientHeight > 1) {
        scrollerRef.current = el;
      }
    };

    document.addEventListener("scroll", onScroll, {
      capture: true,
      passive: true,
    });
    return () =>
      document.removeEventListener("scroll", onScroll, { capture: true });
  }, []);

  return useCallback(() => {
    let el = scrollerRef.current;
    if (!el || !el.isConnected) {
      // Scroller gone (route change) or none seen yet: fall back to the
      // document scroller so a non-scrolled page reads as 0
      scrollerRef.current = null;
      el = document.scrollingElement;
    }
    if (!el) return 0;
    const max = el.scrollHeight - el.clientHeight;
    return max > 0 ? Math.min(1, Math.max(0, el.scrollTop / max)) : 0;
  }, []);
};
