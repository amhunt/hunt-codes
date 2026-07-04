/**
 * Cached per-frame DOM lookups for the 3D scenes that glue themselves to
 * (or position) DOM elements each frame.
 */

const elementCache = new Map<string, Element>();

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
