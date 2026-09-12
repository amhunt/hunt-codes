import React from "react";
import type { Preview } from "@storybook/react";
import { MemoryRouter } from "react-router-dom";

import { TooltipProvider, TOOLTIP_DELAY_MS } from "../src/ui/tooltip";

// The real stylesheets, in the order index.js loads them — both carry
// layout the stories depend on
import "../src/index.css";
import "../src/App.scss";

/**
 * The site's own breakpoints, not generic device presets: `useWindowSize`
 * splits at 768 and 1000, so each width sits inside a band. `xl` is the
 * same `lg` branch with the most room to look empty.
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
 * Stories render the page's *settled* state. Anything that doesn't paint
 * continuously — a screenshot tool, a visual-regression runner, a
 * background tab — throttles the animation clock, so Home's 3s entrance
 * never advances and the story captures a blank page (measured: opacity
 * stuck at 0.019 across five seconds). Judge the intro in the real app.
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
  .view-mode-switch {
    transition: none !important;
  }
`;

const preview: Preview = {
  parameters: {
    layout: "fullscreen",
    viewport: { options: VIEWPORTS },
    controls: { expanded: true },
  },
  // Space is the default; the toolbar switch flips stories to mesh so
  // both can be checked (App.scss keys off .App.space/.App.mesh)
  globalTypes: {
    palette: {
      description: "Scene view",
      toolbar: {
        title: "View",
        icon: "globe",
        items: [
          { value: "space", title: "Space" },
          { value: "mesh", title: "Mesh" },
        ],
        dynamicTitle: true,
      },
    },
  },
  initialGlobals: { palette: "space" },
  decorators: [
    (Story, context) => {
      const palette = (context.globals.palette as string) ?? "space";
      return (
        <MemoryRouter initialEntries={["/home"]}>
          {/* Radix throws without one in scope. Same job as the .App
              class and the backdrop: stand in for the app shell. */}
          <TooltipProvider delayDuration={TOOLTIP_DELAY_MS}>
            <style>{SETTLED_ENTRANCES}</style>
            <div
              className={`App ${palette}`}
              style={{
                minHeight: "100vh",
                // Standing in for the WebGL canvases, which stories leave
                // out — without this the page is white-on-white
                background: palette === "mesh" ? "#050f22" : "#000",
              }}
            >
              <Story />
            </div>
          </TooltipProvider>
        </MemoryRouter>
      );
    },
  ],
};

export default preview;
