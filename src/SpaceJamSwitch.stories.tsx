import React, { useState } from "react";
import type { Meta, StoryObj } from "@storybook/react";
import { expect, spyOn, userEvent, within } from "storybook/test";

import DayNightSwitch from "./DayNightSwitch";
import SpaceJamSwitch from "./SpaceJamSwitch";

/**
 * The bottom-left music switch, with its muted (red-slashed speaker,
 * flatline) and playing (speaker, bouncing equaliser) dressings. Hovering
 * or focusing it shows the "Play space jams" / "Pause space jams" tooltip.
 * The toolbar palette switch (`.App.day` / `.App.night`) shows it over
 * both backdrops.
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
        name: "Space jams",
      });
      await userEvent.click(toggle);
      await expect(toggle).toHaveAttribute("aria-checked", "true");
    } finally {
      play.mockRestore();
    }
  },
};

/** Day palette, muted — the charcoal track over the pastel sky. */
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
 * and joins the music switch in a bottom-left control row. Checks the two
 * sit level and the gap between them (`.day-night-switch`'s lg `left` is
 * the switch's width plus a gap).
 */
export const ControlRowLarge: Story = {
  globals: { viewport: { value: "lg" } },
  render: () => <ControlRow />,
};
