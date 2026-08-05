import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Star } from "react-feather";
import { Check, Link2, Wand2 } from "lucide-react";

const DRAWABLE_SELECTORS =
  "path, circle, ellipse, line, polyline, polygon, rect";

/** Number of wave keyframe variants elements are cycled through. */
const NUM_WAVE_VARIANTS = 14;

/**
 * Keyframes + per-element assignments for the drawing animation.
 *
 * This is emitted as static CSS inside the SVG rather than applied as
 * inline styles from JS, because drawings render inside an `<img>` where
 * no script can run (see toDataUri). Variants cycle via :nth-of-type
 * instead of Math.random for the same reason — the CSS has to stand on
 * its own. The reduced-motion block matters more than usual here: these
 * are infinite animations, and App.scss's global block can't reach
 * inside an image's own document.
 *
 * Note that nothing here sets a bare `opacity: 0` — the entrance fades in
 * via animation fill instead. A zero base opacity means any context that
 * doesn't advance the animation (static rasterization, a browser that
 * declines to animate SVG-as-image) renders a permanently blank drawing.
 * Visible has to be the resting state.
 */
const buildAnimationCSS = () => {
  let css = `
    @keyframes svg-entrance {
      from { opacity: 0; transform: translateY(10px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
    ${DRAWABLE_SELECTORS} {
      transform-origin: center center;
      transform-box: fill-box;
      animation: svg-entrance 0.7s ease both;
    }
  `;

  for (let v = 0; v < NUM_WAVE_VARIANTS; v++) {
    // Amplitudes vary per variant; deterministic so the CSS is stable
    const ax = ((v * 37) % 24) / 2 - 6;
    const ay = ((v * 53) % 32) / 2 - 8;
    const rot = ((v * 29) % 12) / 2 - 3;
    const s1 = 0.97 + ((v * 7) % 6) / 100;
    const s2 = 0.96 + ((v * 11) % 8) / 100;
    const waveDuration = 5 + ((v * 13) % 90) / 10; // 5 – 14 s
    const entranceDelay = Math.min(v * 0.045, 2.5);

    css += `
      @keyframes svg-wave-${v} {
        0%, 100% {
          transform: translate(0px, 0px) rotate(0deg) scale(1);
        }
        20% {
          transform: translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${s1.toFixed(3)});
        }
        40% {
          transform: translate(${(-ax * 0.8).toFixed(1)}px, ${(ay * 0.4).toFixed(1)}px) rotate(${(-rot * 0.7).toFixed(1)}deg) scale(${s2.toFixed(3)});
        }
        60% {
          transform: translate(${(-ax * 0.3).toFixed(1)}px, ${(-ay * 0.9).toFixed(1)}px) rotate(${(rot * 0.5).toFixed(1)}deg) scale(${(2 - s1).toFixed(3)});
        }
        80% {
          transform: translate(${(ax * 0.6).toFixed(1)}px, ${(-ay * 0.2).toFixed(1)}px) rotate(${(-rot * 0.3).toFixed(1)}deg) scale(1);
        }
      }
      :is(${DRAWABLE_SELECTORS}):nth-of-type(${NUM_WAVE_VARIANTS}n + ${v + 1}) {
        animation:
          svg-entrance 0.7s ease ${entranceDelay.toFixed(2)}s both,
          svg-wave-${v} ${waveDuration.toFixed(1)}s ease-in-out ${(-waveDuration * (v / NUM_WAVE_VARIANTS)).toFixed(1)}s infinite;
      }
    `;
  }

  css += `
    @media (prefers-reduced-motion: reduce) {
      ${DRAWABLE_SELECTORS} {
        animation: svg-entrance 0.7s ease forwards !important;
      }
    }
  `;

  return css;
};

/** A stored drawing as the API returns it. */
type Drawing = {
  id: string;
  name: string;
  prompt: string;
  svg: string;
  createdAt: string;
};

/**
 * Turn a stored drawing into an `<img>`-ready data URI.
 *
 * Drawings are other people's content, and this is what keeps them
 * harmless: inside an `<img>`, scripts never execute, event handlers
 * (including SMIL onbegin/onend on <animate>) never fire, CSS cannot
 * reach the host page, and each image is its own document — so internal
 * ids can't collide across the twelve gallery thumbnails either. An
 * earlier version inlined the markup with dangerouslySetInnerHTML and
 * relied on the server's regex allowlist alone; that allowlist was
 * bypassable, and inline SVG gives up all four of those guarantees.
 * Do not switch this back to inlining.
 */
const toDataUri = (svg: string) => {
  const animated = svg.replace(
    /^(<svg[^>]*>)/i,
    `$1<style>${buildAnimationCSS()}</style>`,
  );
  // btoa is latin1-only; encode UTF-8 first so non-ASCII markup survives
  const utf8 = new TextEncoder().encode(animated);
  let binary = "";
  utf8.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:image/svg+xml;base64,${btoa(binary)}`;
};

// localStorage can throw (blocked cookies, some embedded webviews) —
// treat persistence as best-effort
const readStoredName = () => {
  try {
    return localStorage.getItem("draw-name") || "";
  } catch {
    return "";
  }
};

/**
 * CloudFront reaches the API Lambda through an Origin Access Control,
 * which SigV4-signs origin requests but cannot hash request bodies
 * itself — POSTs must carry the payload hash or the signature fails.
 */
const sha256Hex = async (text: string) => {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(text),
  );
  return Array.from(new Uint8Array(digest), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
};

/** API errors are JSON `{error}`; anything else gets a generic line. */
const readApiError = async (response: Response) => {
  try {
    const data = (await response.json()) as { error?: string } | null;
    if (data && typeof data.error === "string") return data.error;
  } catch {
    // non-JSON body (proxy hiccup) — fall through
  }
  return `mission control error ${response.status} — try again`;
};

const SvgGenerator = () => {
  const { id: routeId } = useParams();
  const navigate = useNavigate();

  const [prompt, setPrompt] = useState("");
  const [name, setName] = useState(readStoredName);
  const [drawing, setDrawing] = useState<Drawing | null>(null);
  const [gallery, setGallery] = useState<Drawing[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const nameInputRef = useRef<HTMLInputElement>(null);
  // Set for the whole POST /api/draw round trip. Generation clears the
  // displayed drawing, which would otherwise look to the permalink effect
  // below like "we're on /draw/:id with nothing loaded" — it would re-fetch
  // the OLD drawing, drop it on screen mid-generation, and clear the
  // spinner, inviting a second click and a second billed generation.
  const generatingRef = useRef(false);
  // Which drawing id is currently displayed — see the permalink effect
  const loadedIdRef = useRef<string | null>(null);
  // Generation runs for up to 50s, which is plenty of time for the visitor
  // to wander off. These let the response check whether anyone is still
  // waiting for it before it moves the page around.
  const mountedRef = useRef(true);
  const routeIdRef = useRef(routeId);
  // True while the permalink effect has a request open. Generation checks it
  // before clearing the spinner so it can't switch off a spinner that now
  // belongs to somebody else's fetch.
  const permalinkLoadingRef = useRef(false);
  // Mirrors generatingRef for rendering — the ref is the synchronous lock,
  // this drives the copy the visitor actually reads
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    routeIdRef.current = routeId;
  }, [routeId]);

  // Persist the signature; clearing the field forgets it
  useEffect(() => {
    try {
      if (name) {
        localStorage.setItem("draw-name", name);
      } else {
        localStorage.removeItem("draw-name");
      }
    } catch {
      // storage unavailable — the name just won't persist
    }
  }, [name]);

  // Focus the right input on mount: prompt if signed, name if not
  useEffect(() => {
    const timer = setTimeout(() => {
      (readStoredName() ? inputRef : nameInputRef).current?.focus();
    }, 500);
    return () => clearTimeout(timer);
  }, []);

  // Landing on /draw (no id) is a fresh canvas. Clearing loading here too
  // is what rescues a back-navigation out of an in-flight permalink fetch:
  // that fetch's own cleanup marks itself cancelled and never resets it.
  useEffect(() => {
    if (!routeId && !generatingRef.current) {
      loadedIdRef.current = null;
      setDrawing(null);
      setError("");
      setLoading(false);
    }
  }, [routeId]);

  // Load a permalinked drawing (skipped when we just generated it ourselves).
  // Which drawing is already loaded is tracked in a ref rather than read off
  // `drawing`, so the effect can clear the previous artwork without listing
  // it as a dependency and re-triggering itself. Clearing matters: hopping
  // between gallery permalinks would otherwise leave the old drawing on
  // screen under the new URL — its caption naming one artist while the
  // copy-link button points at another — and a failed fetch would strand it
  // there for good.
  // Deliberately does NOT bail while a generation is in flight: the visitor
  // clicking a gallery card mid-generation means they want that drawing, and
  // skipping the fetch left the URL pointing at artwork that never loaded.
  // Generation no longer collides with this — it checks the route before
  // touching `drawing`, and on success it sets loadedIdRef before navigating,
  // so the id check below already short-circuits the redundant refetch.
  useEffect(() => {
    if (!routeId || loadedIdRef.current === routeId) return;
    let cancelled = false;
    permalinkLoadingRef.current = true;
    setLoading(true);
    setError("");
    // The ref tracks what's in `drawing`, so the two are always cleared
    // together — leaving it set here would make a failed load look like a
    // successful one, and navigating back to that id would skip the fetch
    // and render nothing.
    loadedIdRef.current = null;
    setDrawing(null);
    void (async () => {
      try {
        const response = await fetch(`/api/drawings/${routeId}`);
        if (!response.ok) throw new Error(await readApiError(response));
        const data = (await response.json()) as Drawing;
        if (!cancelled) {
          loadedIdRef.current = routeId;
          setDrawing(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error
              ? err.message
              : "that drawing drifted off into deep space",
          );
        }
      } finally {
        permalinkLoadingRef.current = false;
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
      permalinkLoadingRef.current = false;
    };
  }, [routeId]);

  // The gallery of recent transmissions — decoration, so it fails quietly
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const response = await fetch("/api/drawings");
        if (!response.ok) return;
        const data = (await response.json()) as { drawings?: Drawing[] };
        if (!cancelled && Array.isArray(data.drawings)) {
          setGallery(data.drawings);
        }
      } catch {
        // no gallery today
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const generateSvg = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    const trimmedName = name.trim();
    // `loading` is state, so it lags the click that set it: a second Enter
    // or click landing before React re-renders would still read false and
    // fire a second billed generation. The ref flips synchronously, so it
    // is the real lock and has to be checked first.
    if (!trimmedPrompt || generatingRef.current || loading) return;

    if (!trimmedName) {
      setError("every artist signs their work — add your name first");
      nameInputRef.current?.focus();
      return;
    }

    // What was on screen when we started, so a failure can put it back, and
    // where we started, so a slow response can tell whether the visitor is
    // still on the page it was meant for
    const previous = drawing;
    const startedOn = routeIdRef.current;
    const stillHere = () =>
      mountedRef.current && routeIdRef.current === startedOn;

    generatingRef.current = true;
    setGenerating(true);
    setLoading(true);
    setError("");
    // Cleared together with `drawing` — leaving the ref set through a failed
    // generation made the permalink look loaded when it wasn't, and the
    // drawing at that URL could never come back
    loadedIdRef.current = null;
    setDrawing(null);
    setCopied(false);

    try {
      const body = JSON.stringify({ name: trimmedName, prompt: trimmedPrompt });
      const response = await fetch("/api/draw", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-amz-content-sha256": await sha256Hex(body),
        },
        body,
      });
      if (!response.ok) throw new Error(await readApiError(response));

      const data = (await response.json()) as Drawing;
      // The drawing exists either way, so let it into the gallery even if
      // the visitor has moved on — it just isn't worth yanking them back
      if (mountedRef.current) {
        setGallery((prev) =>
          [data, ...prev.filter((d) => d.id !== data.id)].slice(0, 12),
        );
      }
      if (stillHere()) {
        loadedIdRef.current = data.id;
        setDrawing(data);
        // Give the fresh drawing its shareable home
        void navigate(`/draw/${data.id}`);
      }
    } catch (err) {
      if (stillHere()) {
        setError(err instanceof Error ? err.message : "Failed to generate SVG");
        // Put back whatever the URL is still pointing at
        if (previous) {
          loadedIdRef.current = previous.id;
          setDrawing(previous);
        }
      }
    } finally {
      generatingRef.current = false;
      if (mountedRef.current) {
        setGenerating(false);
        // Leave the spinner alone if a permalink fetch started mid-generation
        // and now owns it — that fetch clears it when it settles
        if (!permalinkLoadingRef.current) setLoading(false);
      }
    }
  }, [prompt, name, loading, drawing, navigate]);

  const copyLink = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // clipboard unavailable — the address bar still works
    }
  }, []);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      void generateSvg();
    }
  };

  return (
    <div className="svg-generator-page">
      <div className="svg-generator-back-link">
        <Link
          aria-label="Back to landing page"
          className="mt-4 flex items-center gap-1 transition-transform"
          to="/"
        >
          <Star className="starIcon" size={16} />
        </Link>
      </div>

      <div className="svg-generator-container">
        <h1 className="svg-generator-title">SVG Studio</h1>
        <p className="svg-generator-subtitle">
          Describe an image and watch AI bring it to life as an animated SVG
        </p>

        {/* Signature — every drawing is signed by its artist */}
        <div className="svg-generator-name-row">
          <input
            ref={nameInputRef}
            aria-label="Your name — it signs your drawing"
            className="svg-generator-name-input"
            type="text"
            placeholder="sign your work, space cadet"
            value={name}
            maxLength={40}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        {/* Prompt Input */}
        <div className="svg-generator-input-row">
          <input
            ref={inputRef}
            aria-label="Describe an image to draw"
            className="svg-generator-input"
            type="text"
            placeholder='Describe an image to draw, e.g. "saturn with rings"'
            value={prompt}
            maxLength={300}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            spellCheck={false}
          />
          <button
            className="svg-generator-button"
            onClick={() => void generateSvg()}
            disabled={loading || !prompt.trim()}
            type="button"
            aria-label={loading ? "Generating…" : "Generate drawing"}
          >
            {loading ? (
              <span className="svg-generator-spinner" aria-hidden="true" />
            ) : (
              <Wand2 size={20} aria-hidden="true" />
            )}
          </button>
        </div>

        {/* Error */}
        {error && <p className="svg-generator-error">{error}</p>}

        {/* Result */}
        <div
          className={`svg-generator-result ${drawing ? "has-content" : ""} ${loading ? "is-loading" : ""}`}
        >
          {loading && (
            <div className="svg-generator-loading">
              <div className="svg-generator-loading-dots">
                <span />
                <span />
                <span />
              </div>
              <p>
                {/* Not `routeId && !drawing` — regenerating from a permalink
                    also clears the drawing while the id stays in the URL,
                    which read as "tuning in" when we were really drawing */}
                {generating
                  ? "Generating your SVG..."
                  : "Tuning into the transmission..."}
              </p>
            </div>
          )}
          {drawing && (
            <>
              <div className="svg-generator-svg-wrapper">
                <img
                  alt={`${drawing.prompt} — drawn by ${drawing.name}`}
                  src={toDataUri(drawing.svg)}
                />
              </div>
              <div className="svg-generator-caption">
                <span className="svg-generator-caption-text">
                  &ldquo;{drawing.prompt}&rdquo; — drawn by {drawing.name}
                </span>
                <button
                  className="svg-generator-copy-btn"
                  onClick={() => void copyLink()}
                  type="button"
                >
                  {copied ? <Check size={13} /> : <Link2 size={13} />}
                  {copied ? "copied!" : "copy link"}
                </button>
              </div>
            </>
          )}
        </div>

        {/* Recent transmissions */}
        {gallery.length > 0 && (
          <div className="svg-generator-gallery">
            <h2 className="svg-generator-gallery-title">
              recent transmissions
            </h2>
            <div className="svg-generator-gallery-grid">
              {gallery.map((d) => (
                <Link
                  key={d.id}
                  className="svg-generator-gallery-card"
                  to={`/draw/${d.id}`}
                  title={`"${d.prompt}" by ${d.name}`}
                >
                  <div className="svg-generator-gallery-thumb">
                    <img alt={d.prompt} src={toDataUri(d.svg)} loading="lazy" />
                  </div>
                  <p className="svg-generator-gallery-name">{d.name}</p>
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SvgGenerator;
