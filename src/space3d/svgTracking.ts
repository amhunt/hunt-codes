/**
 * Per-frame tracking of an SVG element so a 3D scene can render into its
 * exact screen-space box. Reading the rect + computed opacity every frame
 * is what keeps the WebGL layer glued to CSS-animated elements (the moon
 * rise/set keyframes, fade-in transitions) — the reads are a few
 * microseconds per element. This is the pattern for anchoring any future
 * scene to a DOM element.
 */

export interface TrackedSvg {
  /** Uniform viewBox -> CSS px scale (preserveAspectRatio="xMidYMid meet") */
  scale: number;
  /** CSS px position of the viewBox origin */
  offsetX: number;
  offsetY: number;
  /** Effective opacity: the element's, multiplied up through its ancestors */
  opacity: number;
}

const elementCache = new Map<string, Element>();

/**
 * Returns the tracked geometry for the SVG with the given id, or null when
 * the element is absent or collapsed (scenes should hide themselves then).
 */
export function trackSvgById(
  id: string,
  viewBoxSize: number,
): TrackedSvg | null {
  let el = elementCache.get(id);
  if (!el || !el.isConnected) {
    const found = document.getElementById(id);
    if (!found) {
      elementCache.delete(id);
      return null;
    }
    elementCache.set(id, found);
    el = found;
  }

  const rect = el.getBoundingClientRect();
  if (rect.width === 0 || rect.height === 0) return null;

  const scale = Math.min(rect.width, rect.height) / viewBoxSize;

  let opacity = 1;
  let node: Element | null = el;
  while (node && node !== document.body && opacity > 0.0001) {
    const nodeOpacity = parseFloat(getComputedStyle(node).opacity);
    // An unparseable computed opacity means "not set", i.e. 1 — a real
    // "0" must still zero the product, so no falsy-|| shortcut here
    if (!Number.isNaN(nodeOpacity)) opacity *= nodeOpacity;
    node = node.parentElement;
  }

  return {
    scale,
    offsetX: rect.left + (rect.width - viewBoxSize * scale) / 2,
    offsetY: rect.top + (rect.height - viewBoxSize * scale) / 2,
    opacity,
  };
}

/** Cached getElementById with a liveness check, for per-frame lookups. */
export function liveElementById(id: string): Element | null {
  let el = elementCache.get(id);
  if (!el || !el.isConnected) {
    const found = document.getElementById(id);
    if (!found) {
      elementCache.delete(id);
      return null;
    }
    elementCache.set(id, found);
    el = found;
  }
  return el;
}
