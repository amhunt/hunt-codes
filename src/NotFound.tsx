import React, { useEffect } from "react";
import { Link } from "react-router-dom";

/**
 * The catch-all for paths that aren't on the map. The SPA answers every
 * URL with a 200, so this page tells crawlers not to index it (soft-404
 * mitigation) and hands lost visitors a way back to the solar system.
 */
const NotFound = () => {
  useEffect(() => {
    // index.html ships an "index, follow" robots meta — flip it rather
    // than appending a second, conflicting tag
    const existing = document.querySelector<HTMLMetaElement>(
      'meta[name="robots"]',
    );
    if (existing) {
      const previous = existing.content;
      existing.content = "noindex";
      return () => {
        existing.content = previous;
      };
    }
    const meta = document.createElement("meta");
    meta.name = "robots";
    meta.content = "noindex";
    document.head.appendChild(meta);
    return () => {
      meta.remove();
    };
  }, []);

  return (
    <main className="not-found-page">
      <h1>lost in space?</h1>
      <p>you’ve drifted off the map.</p>
      <Link to="/home">take me home</Link>
    </main>
  );
};

export default NotFound;
