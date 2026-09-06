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

let scrubs;
let aboutEnabled;

/** The resume: the journey sits behind a native scroller */
function AboutPage() {
  const scroller = React.useRef(null);
  useScrollJourney(2, {
    scroller,
    enabled: aboutEnabled,
    onScrub: (progress) => scrubs.push(progress),
  });
  return <div data-scroller ref={scroller} />;
}

function Location() {
  return <output>{useLocation().pathname}</output>;
}

beforeEach(() => {
  now = 0;
  scrubs = [];
  aboutEnabled = true;
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

const PATHS = ["/", "/home", "/about"];

async function mount(stop = 0, { enabled = true } = {}) {
  journey.target = journey.progress = stop;
  aboutEnabled = enabled;
  await act(async () => {
    root.render(
      <MemoryRouter initialEntries={[PATHS[stop]]}>
        <Location />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/home" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
        </Routes>
      </MemoryRouter>,
    );
  });
}

const location = () => container.querySelector("output").textContent;
const scroller = () => container.querySelector("[data-scroller]");

async function frame(ms = 16) {
  now += ms;
  const pending = [...frames.values()];
  frames.clear();
  await act(async () => {
    for (const callback of pending) callback(now);
  });
}

async function wheel(deltaY, { cancelable = true } = {}) {
  const event = new WheelEvent("wheel", { deltaY, cancelable });
  await act(async () => {
    window.dispatchEvent(event);
  });
  return event;
}

async function touch(type, y, { cancelable = true } = {}) {
  const event = new Event(type, { cancelable });
  Object.defineProperty(event, "touches", {
    value: y === undefined ? [] : [{ clientY: y }],
  });
  await act(async () => {
    window.dispatchEvent(event);
  });
  return event;
}

/** Lets the journey settle at the nearest stop after the last input */
async function settle() {
  await frame(240);
  await frame(1300);
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
  expect(location()).toBe(PATHS[start]);
  journey.progress = end;
  await frame();
  expect(location()).toBe(PATHS[end]);
});

// ─── /about: the journey behind the resume's own scroller ───────────────

test("scrolling up from the top of the resume scrubs back toward home", async () => {
  await mount(2);
  const event = await wheel(-330);
  expect(journey.target).toBeCloseTo(1.7);
  // Ours — the resume must not scroll under the swoop
  expect(event.defaultPrevented).toBe(true);
  await settle();
  // A short nudge settles back here and the resume is native again
  expect(journey.target).toBe(2);
  expect((await wheel(330)).defaultPrevented).toBe(false);
  // (a pause: that down-scroll handed its stream to the resume)
  now += 300;
  await wheel(-770);
  expect(journey.target).toBeCloseTo(1.3);
  await settle();
  expect(journey.target).toBe(1);
  expect(location()).toBe("/about");
  journey.progress = 1;
  await frame();
  expect(location()).toBe("/home");
});

test("scrolling down, or up from mid-resume, leaves the journey alone", async () => {
  await mount(2);
  expect((await wheel(330)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
  scroller().scrollTop = 200;
  expect((await wheel(-330)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
});

test("momentum from a flick up to the top does not roll on into the journey", async () => {
  await mount(2);
  scroller().scrollTop = 200;
  await wheel(-120);
  // The flick lands at the top, still delivering momentum
  scroller().scrollTop = 0;
  now += 100;
  expect((await wheel(-120)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
  // A fresh gesture from the top is the visitor asking to head back
  now += 300;
  expect((await wheel(-330)).defaultPrevented).toBe(true);
  expect(journey.target).toBeCloseTo(1.7);
});

test("mid-scrub the journey owns the wheel in both directions until it settles back", async () => {
  await mount(2);
  await wheel(-550);
  expect(journey.target).toBeCloseTo(1.5);
  const back = await wheel(110);
  expect(back.defaultPrevented).toBe(true);
  expect(journey.target).toBeCloseTo(1.6);
  await settle();
  expect(journey.target).toBe(2);
  expect((await wheel(110)).defaultPrevented).toBe(false);
});

test("a downward swipe from the top joins the journey; one from mid-resume scrolls", async () => {
  await mount(2);
  scroller().scrollTop = 200;
  await touch("touchstart", 200);
  expect((await touch("touchmove", 400)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
  await touch("touchend");
  scroller().scrollTop = 0;
  await touch("touchstart", 200);
  // Finger down = content up = back toward home
  expect((await touch("touchmove", 400)).defaultPrevented).toBe(true);
  expect(journey.target).toBeCloseTo(2 - 400 / 1100);
  await touch("touchend");
});

test("onScrub follows the rendered progress away from the stop and once more on return", async () => {
  await mount(2);
  await frame();
  expect(scrubs).toEqual([]);
  await wheel(-330);
  journey.progress = 1.7;
  await frame();
  journey.progress = 1.4;
  await frame();
  // The settle lands the target first; the camera follows
  journey.target = 2;
  journey.progress = 1.9;
  await frame();
  journey.progress = 2;
  await frame();
  await frame();
  expect(scrubs).toEqual([1.7, 1.4, 1.9, 2]);
});

test("the glide-in tail of a scroll arrival is not a scrub", async () => {
  await mount(2);
  // Home committed the route with the camera 0.02 short; the target is
  // already here
  journey.progress = 1.98;
  await frame();
  journey.progress = 2;
  await frame();
  expect(scrubs).toEqual([]);
});

test("before the rig adopts the stop, and while a link swoop flies, the resume scrolls natively", async () => {
  await mount(2);
  // A fresh load: the module still holds the stale zeros
  journey.initialized = false;
  journey.target = journey.progress = 0;
  expect((await wheel(-330)).defaultPrevented).toBe(false);
  expect((await wheel(330)).defaultPrevented).toBe(false);
  await touch("touchstart", 200);
  expect((await touch("touchmove", 400)).defaultPrevented).toBe(false);
  await touch("touchend");
  expect(journey.target).toBe(0);
  journey.initialized = true;
  journey.target = journey.progress = 2;
  journey.rigSettled = false;
  now += 300;
  expect((await wheel(-330)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
});

test("a gesture handed to the resume stays native even if it overshoots back to the top", async () => {
  await mount(2);
  // Starts at the top but heads down: the resume takes it
  expect((await wheel(120)).defaultPrevented).toBe(false);
  now += 100;
  // ...and keeps it when the same stream reverses past the top
  expect((await wheel(-330)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
  now += 300;
  expect((await wheel(-330)).defaultPrevented).toBe(true);
  expect(journey.target).toBeCloseTo(1.7);
  await settle();
  // Same for a finger: a downward jitter releases the whole drag
  await touch("touchstart", 200);
  expect((await touch("touchmove", 190)).defaultPrevented).toBe(false);
  expect((await touch("touchmove", 400)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
  await touch("touchend");
});

test("input the browser has already committed to scrolling is left alone", async () => {
  await mount(2);
  expect((await wheel(-330, { cancelable: false })).defaultPrevented).toBe(
    false,
  );
  await touch("touchstart", 200);
  await touch("touchmove", 400, { cancelable: false });
  await touch("touchend");
  expect(journey.target).toBe(2);
});

test("with the gate stood down (the reel playing) nothing is claimed", async () => {
  await mount(2, { enabled: false });
  expect((await wheel(-330)).defaultPrevented).toBe(false);
  expect(journey.target).toBe(2);
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
