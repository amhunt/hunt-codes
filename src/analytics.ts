/**
 * GA4 plumbing for the SPA. The gtag snippet in public/index.html loads
 * the tag with `send_page_view: false`, so every page_view — the first
 * one included — is sent from here as the router settles on a route
 * (App.tsx's RouteMeta). Sending `page_location` with each view is what
 * lets GA attribute the engagement time that follows to that page, which
 * is how "time on /about" ends up meaning something for a client-routed
 * site.
 *
 * Clicks are captured once, at the document, rather than by sprinkling
 * handlers: any click that lands on a link or button is reported as a
 * `ui_click` named by `data-track`, then `aria-label`, then the visible
 * text. Links also carry their href and whether they leave the site.
 *
 * Everything is a no-op outside production builds so dev servers,
 * Storybook and `bun test` never pollute the property.
 */

declare global {
  interface Window {
    gtag?: (...args: unknown[]) => void;
  }
}

type EventParams = Record<string, string | number | boolean | undefined>;

const isProduction = process.env.NODE_ENV === "production";

const gtag = (...args: unknown[]) => {
  if (!isProduction || typeof window.gtag !== "function") return;
  window.gtag(...args);
};

/** Report a custom event. Names follow GA4's snake_case convention. */
export const trackEvent = (name: string, params: EventParams = {}) => {
  gtag("event", name, params);
};

/** Report a route as viewed; call once per navigation, after the title is set. */
export const trackPageView = (pathname: string) => {
  gtag("event", "page_view", {
    page_path: pathname,
    page_location: window.location.href,
    page_title: document.title,
  });
};

/** How many characters of visible text to keep as a fallback label */
const TEXT_LABEL_MAX = 60;

const clickLabel = (target: HTMLElement): string | undefined => {
  const explicit = target.dataset.track ?? target.getAttribute("aria-label");
  if (explicit) return explicit;
  const text = target.textContent?.replaceAll(/\s+/g, " ").trim();
  return text ? text.slice(0, TEXT_LABEL_MAX) : undefined;
};

/**
 * Listen for clicks on links and buttons app-wide. Runs in the capture
 * phase so a click that immediately navigates away is still recorded.
 * Returns the teardown for useEffect.
 */
export const installClickTracking = () => {
  const onClick = (event: MouseEvent) => {
    const origin = event.target;
    if (!(origin instanceof Element)) return;
    const target = origin.closest<HTMLElement>("a, button, [role='button']");
    if (!target) return;
    const label = clickLabel(target);
    if (!label) return;

    const params: EventParams = {
      label,
      page_path: window.location.pathname,
    };
    if (target instanceof HTMLAnchorElement && target.href) {
      params.href = target.href;
      params.outbound =
        target.protocol.startsWith("http") &&
        target.host !== window.location.host;
    }
    trackEvent("ui_click", params);
  };

  document.addEventListener("click", onClick, { capture: true, passive: true });
  return () => {
    document.removeEventListener("click", onClick, { capture: true });
  };
};
