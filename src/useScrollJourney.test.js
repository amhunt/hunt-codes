import React, { act } from "react";
import { afterEach, beforeEach, expect, spyOn, test } from "bun:test";
import { createRoot } from "react-dom/client";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";

import useScrollJourney from "./useScrollJourney";
import { scrollTransitionState as journey } from "./scrollTransition";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let now;
let frames;
let root;
let container;
let spies;

function LandingPage() {
  useScrollJourney(0);
  return null;
}

function HomePage() {
  useScrollJourney(1);
  return null;
}

function Location() {
  return <output>{useLocation().pathname}</output>;
}

beforeEach(() => {
  now = 0;
  frames = new Map();
  let frameId = 0;
  spies = [
    spyOn(performance, "now").mockImplementation(() => now),
    spyOn(globalThis, "requestAnimationFrame").mockImplementation(
      (callback) => {
        frames.set(++frameId, callback);
        return frameId;
      },
    ),
    spyOn(globalThis, "cancelAnimationFrame").mockImplementation((id) => {
      frames.delete(id);
    }),
  ];
  Object.assign(journey, {
    target: 0,
    progress: 0,
    initialized: true,
    rigSettled: true,
  });
  container = document.createElement("div");
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  for (const spy of spies) spy.mockRestore();
  Object.assign(journey, {
    target: 0,
    progress: 0,
    initialized: false,
    rigSettled: false,
  });
});

async function mount(stop = 0) {
  journey.target = journey.progress = stop;
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[stop === 0 ? "/" : "/home"]}>
        <Location />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<p>Resume</p>} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

async function frame(ms = 16) {
  now += ms;
  const pending = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of pending) callback(now);
  });
}

async function wheel(deltaY) {
  await act(async () => {
    window.dispatchEvent(new WheelEvent("wheel", { deltaY }));
  });
}

async function touch(type, y) {
  await act(async () => {
    const event = new Event(type, { cancelable: true });
    Object.defineProperty(event, "touches", {
      value: y === undefined ? [] : [{ clientY: y }],
    });
    window.dispatchEvent(event);
  });
}

test.each([
  [0, 330, 0],
  [0, 770, 1],
  [1, 330, 1],
  [1, 770, 2],
  [1, -330, 1],
  [1, -770, 0],
])("from stop %s, a %spx scroll settles at %s", async (start, delta, end) => {
  await mount(start);
  await wheel(delta);
  const partial = journey.target;
  await frame(200);
  expect(journey.target).toBe(partial);
  await frame(32);
  await frame(600);
  expect(journey.target).toBeGreaterThan(Math.min(partial, end));
  expect(journey.target).toBeLessThan(Math.max(partial, end));
  await frame(600);
  expect(journey.target).toBe(end);
  // Target arrival alone must not navigate while the camera is behind.
  expect(container.textContent).toBe(start === 0 ? "/" : "/home");
  journey.progress = end;
  await frame();
  expect(container.querySelector("output").textContent).toBe(
    ["/", "/home", "/about"][end],
  );
});

test("settling accelerates gently and slows before arrival", async () => {
  await mount();
  await wheel(770);
  await frame(240);
  const positions = [journey.target];
  for (let i = 0; i < 6; i++) {
    await frame(200);
    positions.push(journey.target);
  }
  const travel = positions.slice(1).map((p, i) => p - positions[i]);
  expect(travel[0]).toBeLessThan(travel[1]);
  expect(travel[1]).toBeLessThan(travel[2]);
  expect(travel[3]).toBeGreaterThan(travel[4]);
  expect(travel[4]).toBeGreaterThan(travel[5]);
});

test("new wheel input cancels settling and can reverse its destination", async () => {
  await mount();
  await wheel(770);
  await frame(240);
  await frame(400);
  await wheel(-550);
  const interrupted = journey.target;
  await frame(200);
  expect(journey.target).toBe(interrupted);
  await frame(40);
  await frame(1200);
  expect(journey.target).toBe(0);
});

test.each(["touchend", "touchcancel"])(
  "a held touch pauses settling until %s",
  async (release) => {
    await mount();
    await touch("touchstart", 600);
    await touch("touchmove", 215);
    await frame(2000);
    expect(journey.target).toBeCloseTo(0.7);
    await touch(release);
    await frame(200);
    expect(journey.target).toBeCloseTo(0.7);
    await frame(40);
    await frame(1200);
    expect(journey.target).toBe(1);
  },
);

test("external targets and link transitions take priority over settling", async () => {
  await mount();
  await wheel(330);
  await frame(240);
  await frame(400);
  // The scroll hint explicitly requests home while settling toward landing.
  journey.target = 1;
  await frame(600);
  expect(journey.target).toBe(1);
  await wheel(330);
  await frame(240);
  journey.rigSettled = false;
  await frame(2000);
  expect(journey.target).toBeCloseTo(1.3);
});

test("unmount cancels pending settling frames and input listeners", async () => {
  await mount();
  await wheel(770);
  await frame(240);
  await act(async () => root.render(null));
  const target = journey.target;
  await wheel(200);
  await touch("touchstart", 600);
  await touch("touchmove", 215);
  await frame(2000);
  expect(frames.size).toBe(0);
  expect(journey.target).toBe(target);
});
