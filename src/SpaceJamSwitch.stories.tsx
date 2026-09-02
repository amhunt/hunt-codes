import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, spyOn, userEvent, within } from "storybook/test";

import DayNightSwitch from "./DayNightSwitch";
import SpaceJamSwitch from "./SpaceJamSwitch";

/**
 * The bottom-left "Space jam" pill: the label plus the music switch, with
 * its muted (red-slashed speaker, flatline) and playing (speaker, bouncing
 * equaliser) dressings. The pill takes its palette from the `.App.day` /
 * `.App.night` wrapper, so the toolbar palette switch covers both looks.
 *
 * Flipping the switch by hand plays the real track (`public/` is served
 * as Storybook's static dir).
 */
const meta = {
  title: "Controls/Space jam switch",
  component: SpaceJamSwitch,
  parameters: {
    layout: "fullscreen",
  },
} satisfies Meta<typeof SpaceJamSwitch>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The resting state: charcoal track, flatline, slashed speaker. */
export const Muted: Story = {};

/**
 * After a flip on: purple track, equaliser, speaker. The click here is
 * synthetic, so the browser would refuse `play()` and the switch would
 * honestly fall back to muted — stub playback so the dressing can be
 * judged (listen for real in the Muted story).
 */
export const Playing: Story = {
  play: async ({ canvasElement }) => {
    const play = spyOn(HTMLMediaElement.prototype, "play").mockResolvedValue();
    try {
      const toggle = within(canvasElement).getByRole("switch", {
        name: "Space jam",
      });
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute("aria-checked", "true");
    } finally {
      play.mockRestore();
    }
  },
};

/** Day palette, muted — the pill goes light with dark text. */
export const MutedDay: Story = {
  globals: { palette: "day" },
};

const ControlRow = () => {
  const [isNightMode, setIsNightMode] = useState(true);
  return (
    <>
      <SpaceJamSwitch />
      <DayNightSwitch
        isNightMode={isNightMode}
        onCheckedChange={setIsNightMode}
      />
    </>
  );
};

/**
 * Laptop width, where the day/night switch leaves the top-right corner
 * and joins the pill in a bottom-left control row. Checks the two sit
 * level and the gap between them (`.day-night-switch`'s lg `left` is
 * tuned by hand against the pill's width).
 */
export const ControlRowLarge: Story = {
  globals: { viewport: { value: "lg" } },
  render: () => <ControlRow />,
};
