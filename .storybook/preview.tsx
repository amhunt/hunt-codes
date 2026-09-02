import React from "react";
import type { Preview } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";

// The real stylesheets, in the order index.js loads them — Tailwind and the
// site's SCSS both carry layout the stories depend on
import "../src/index.css";
import "../src/App.scss";

/**
 * The site's own breakpoints, not generic device presets.
 * `useWindowSize` splits at 768 and 1000 (sm / md / lg), so the widths
 * below sit deliberately inside each band; `xl` is the same `lg` branch
 * on a big desktop, where the layout has the most room to look empty.
 */
const VIEWPORTS = {
  sm: {
    name: "sm — phone (<768)",
    styles: { width: "390px", height: "844px" },
    type: "mobile" as const,
  },
  md: {
    name: "md — tablet (768–999)",
    styles: { width: "834px", height: "1000px" },
    type: "tablet" as const,
  },
  lg: {
    name: "lg — laptop (≥1000)",
    styles: { width: "1280px", height: "800px" },
    type: "desktop" as const,
  },
  xl: {
    name: "xl — wide desktop",
    styles: { width: "1728px", height: "1000px" },
    type: "desktop" as const,
  },
};

/**
 * Stories render the page's *settled* state.
 *
 * Home's entrance is a 2s timer followed by a 1s opacity transition, and
 * the scroll hint waits several seconds more. Any context that doesn't
 * paint continuously — a screenshot tool, a visual-regression runner, a
 * background tab — throttles the animation clock, so the transition never
 * advances and the story captures a blank page. (Measured: opacity stuck
 * at 0.019 across five seconds.)
 *
 * These stories exist to judge layout, so they skip the choreography and
 * show where things land (the day/night switch's own delayed fade-in
 * included). Judge the intro itself in the real app.
 */
const SETTLED_ENTRANCES = `
  .homeInfoContainer {
    opacity: 1 !important;
    transition: none !important;
  }
  .scroll-hint,
  .scroll-hint-label {
    opacity: 1 !important;
    transition: none !important;
  }
  .scroll-hint-chevron {
    animation: none !important;
  }
  .day-night-switch {
    transition: none !important;
  }
`;

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    viewport: { options: VIEWPORTS },
    controls: { expanded: true },
  },
  // Night is the site's default palette; the toolbar switch flips stories
  // to day so both can be checked (App.scss keys off .App.night/.App.day)
  globalTypes: {
    palette: {
      description: "Day/night palette",
      toolbar: {
        title: "Palette",
        icon: "sun",
        items: [
          { value: "night", title: "Night" },
          { value: "day", title: "Day" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { palette: "night" },
  decorators: [
    (Story, context) => {
      const palette = (context.globals.palette as string) ?? "night";
      return (
        <MemoryRouter initialEntries={["/home"]}>
          <style>{SETTLED_ENTRANCES}</style>
          <div
            className={`App ${palette}`}
            style={{
              minHeight: "100vh",
              // In the real app this is the WebGL canvases showing through,
              // which stories leave out on purpose. Without standing in for
              // them the page is white-on-white and unreadable — these are
              // the two palettes' backdrop colours (see the theme-color
              // switch in App.tsx).
              background: palette === "day" ? "#ffc2d9" : "#000",
            }}
          >
            <Story />
          </div>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
