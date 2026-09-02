/**
 * The site's public routes: one list that supplies each page's tab title
 * (App.tsx's RouteMeta) AND the sitemap, which rsbuild.config.ts emits
 * from it at build time — so a new page can't ship titled but missing
 * from the sitemap, or the other way round. Keep this module free of
 * browser and React imports: the build config loads it under Node.
 *
 * Not listed: `/draw/:id` permalinks (dynamic; they share `/draw`'s
 * title) and the `*` catch-all (noindex).
 */
const DEFAULT_TITLE = "Andrew Hunt - Frontend Engineer | New York";

export interface PublicRoute {
  path: string;
  title: string;
  /** Sitemap priority hint, 0–1 */
  priority: number;
}

export const PUBLIC_ROUTES: PublicRoute[] = [
  { path: "/", title: DEFAULT_TITLE, priority: 1 },
  { path: "/home", title: DEFAULT_TITLE, priority: 0.8 },
  { path: "/about", title: "About Me | Andrew Hunt", priority: 0.8 },
  { path: "/draw", title: "SVG Studio | Andrew Hunt", priority: 0.5 },
  { path: "/journey", title: "The Journey | Andrew Hunt", priority: 0.5 },
  { path: "/synth", title: "Space jam studio | Andrew Hunt", priority: 0.5 },
  { path: "/shop", title: "Gift Shop | Andrew Hunt", priority: 0.5 },
];

export const ROUTE_TITLES: Record<string, string> = Object.fromEntries(
  PUBLIC_ROUTES.map((route) => [route.path, route.title]),
);

/** Anything else lands on the catch-all 404 route */
export const NOT_FOUND_TITLE = "Lost in space | Andrew Hunt";

export const SITE_ORIGIN = "https://www.hunt.codes";
