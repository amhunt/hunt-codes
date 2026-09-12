import React, { act } from "react";
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { createRoot } from "react-dom/client";

import ZipVideoPopover from "./ZipVideoPopover";
import * as ambientPad from "./ambientPad";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let root;
let container;
let ducked;

beforeEach(() => {
  ducked = spyOn(ambientPad, "setPadDucked").mockImplementation(() => {});
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  ducked.mockRestore();
});

const render = (onClose = () => {}) =>
  act(async () => root.render(<ZipVideoPopover onClose={onClose} />));

/** The last thing the popover told the pad, or undefined if nothing yet */
const lastDuck = () => ducked.mock.calls.at(-1)?.[0];

const fire = (type) =>
  act(async () => {
    container.querySelector("video").dispatchEvent(new Event(type));
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
