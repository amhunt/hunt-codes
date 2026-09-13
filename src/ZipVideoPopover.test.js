import React, { act } from "react";
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { createRoot } from "react-dom/client";

import ZipVideoPopover from "./ZipVideoPopover";
import * as ambientPad from "./ambientPad";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let ducked;
let paused;

beforeEach(() => {
  ducked = spyOn(ambientPad, "setPadDucked").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  paused = spyOn(HTMLMediaElement.prototype, "pause").mockImplementation(
    () => {},
  );
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  ducked.mockRestore();
  paused.mockRestore();
});

const render = (onClose = () => {}) =>
  act(async () => root.render(<ZipVideoPopover onClose={onClose} />));

/** The last thing the popover told the pad, or undefined if nothing yet */
const lastDuck = () => ducked.mock.calls.at(-1)?.[0];

const fire = (type) =>
  act(async () => {
    document.querySelector("video").dispatchEvent(new Event(type));
  });

test("ducks the pad while the reel plays and restores it on pause", async () => {
  await render();
  // Mounting alone says nothing — autoplay may be refused, and then
  // there's no soundtrack to make room for
  expect(ducked).not.toHaveBeenCalledWith(true);

  await fire("play");
  expect(lastDuck()).toBe(true);

  await fire("pause");
  expect(lastDuck()).toBe(false);

  await fire("play");
  expect(lastDuck()).toBe(true);
});

test("restores the pad when the popover closes mid-reel", async () => {
  await render();
  await fire("play");
  expect(lastDuck()).toBe(true);

  await act(async () => root.unmount());
  expect(lastDuck()).toBe(false);

  // afterEach unmounts again; give it a fresh root to tear down
  root = createRoot(container);
});

test("a re-render with a new onClose doesn't hand the room back early", async () => {
  await render(() => {});
  await fire("play");
  ducked.mockClear();

  // ProjectsAndToys passes an inline arrow, so every parent render is a
  // new identity for the keydown effect to re-run on
  await render(() => {});
  expect(ducked).not.toHaveBeenCalledWith(false);
});

test("renders an inert-background modal and focuses its close button", async () => {
  const trigger = document.createElement("button");
  container.appendChild(trigger);
  trigger.focus();

  await render();

  const dialog = document.querySelector('[role="dialog"]');
  const close = document.querySelector('[aria-label="Close video"]');
  expect(dialog.getAttribute("aria-modal")).toBe("true");
  expect(dialog.getAttribute("aria-labelledby")).toBe("zip-video-title");
  expect(container.inert).toBe(true);
  expect(container.getAttribute("aria-hidden")).toBe("true");
  expect(document.activeElement).toBe(close);
});

test("traps Tab and Shift+Tab inside the modal", async () => {
  await render();
  const close = document.querySelector('[aria-label="Close video"]');
  const video = document.querySelector("video");

  close.focus();
  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }),
  );
  expect(document.activeElement).toBe(video);

  document.dispatchEvent(
    new KeyboardEvent("keydown", { key: "Tab", bubbles: true }),
  );
  expect(document.activeElement).toBe(close);
});

test("Escape closes, pauses, and restores focus to the opener", async () => {
  const trigger = document.createElement("button");
  document.body.insertBefore(trigger, container);
  trigger.focus();
  let closed = false;
  await render(() => {
    closed = true;
    root.render(null);
  });

  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });

  expect(closed).toBe(true);
  expect(paused).toHaveBeenCalled();
  expect(container.inert).toBe(false);
  expect(container.hasAttribute("aria-hidden")).toBe(false);
  expect(document.activeElement).toBe(trigger);
  trigger.remove();
});
