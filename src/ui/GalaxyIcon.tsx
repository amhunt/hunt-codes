import { createLucideIcon } from "lucide-react";

/**
 * A spiral galaxy for the home page's "Back to orbit" link. lucide has no
 * galaxy, so this one is drawn on lucide's own chassis (24-unit grid, 2px
 * round strokes) via `createLucideIcon` — it sits flush with the other
 * back-link icons and takes the same `size` / `className` props. The arms
 * pin their own `fill="none"` so the link's hover fill (App.scss
 * `.starIcon`) lights up just the core and the two stars, not the space
 * between the arms.
 */
const GalaxyIcon = createLucideIcon("galaxy", [
  ["circle", { cx: "12", cy: "12", r: "1.5", key: "core" }],
  [
    "path",
    {
      d: "M14.6 12.0C14.6 12.3 14.8 13.4 14.5 14.0C14.2 14.6 13.5 15.4 12.8 15.7C12.0 16.0 10.9 16.1 10.0 15.9C9.2 15.6 8.1 14.9 7.5 14.0C7.0 13.1 6.5 11.7 6.7 10.6C6.8 9.4 8.1 7.7 8.4 7.1",
      fill: "none",
      key: "arm-1",
    },
  ],
  [
    "path",
    {
      d: "M9.4 12.0C9.4 11.7 9.2 10.6 9.5 10.0C9.8 9.4 10.5 8.6 11.2 8.3C12.0 8.0 13.1 7.9 14.0 8.1C14.8 8.4 15.9 9.1 16.5 10.0C17.0 10.9 17.5 12.3 17.3 13.4C17.2 14.6 15.9 16.3 15.6 16.9",
      fill: "none",
      key: "arm-2",
    },
  ],
  ["circle", { cx: "19", cy: "5", r: "1", key: "star-1" }],
  ["circle", { cx: "5", cy: "19", r: "1", key: "star-2" }],
]);

export default GalaxyIcon;
