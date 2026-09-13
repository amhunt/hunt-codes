import React, { act } from "react";
import { afterEach, beforeEach, expect, test } from "bun:test";
import { createRoot } from "react-dom/client";
import { MemoryRouter } from "react-router-dom";

import RdpCaseStudy from "./RdpCaseStudy";
import { TooltipProvider } from "./ui/tooltip";

globalThis.IS_REACT_ACT_ENVIRONMENT = true;

let container;
let root;

const normalize = (node) => node.textContent.replaceAll(/\s+/g, " ").trim();

beforeEach(() => {
  window.happyDOM.setViewport({ width: 390, height: 844 });
  container = document.createElement("div");
  document.body.append(container);
  root = createRoot(container);
});

afterEach(async () => {
  await act(async () => root.unmount());
  container.remove();
  window.happyDOM.setViewport({ width: 1024, height: 768 });
});

async function renderCaseStudy() {
  await act(async () => {
    root.render(
      <MemoryRouter>
        <TooltipProvider delayDuration={0}>
          <RdpCaseStudy />
        </TooltipProvider>
      </MemoryRouter>,
    );
  });
}

function term(label) {
  return [...container.querySelectorAll(".case-study-term")].find(
    (candidate) => normalize(candidate) === label,
  );
}

async function tap(node) {
  await act(async () => {
    node.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
    node.dispatchEvent(
      new PointerEvent("pointerup", {
        bubbles: true,
        pointerType: "touch",
        isPrimary: true,
      }),
    );
    node.dispatchEvent(new MouseEvent("click", { bubbles: true, detail: 1 }));
  });
}

function expectOpenDefinition(trigger, text) {
  const tooltip = document.body.querySelector('[role="tooltip"]');
  expect(trigger.getAttribute("aria-expanded")).toBe("true");
  expect(tooltip).not.toBeNull();
  expect(normalize(tooltip)).toContain(text);
  expect(trigger.getAttribute("aria-controls")).toBe(tooltip.id);
  expect(trigger.getAttribute("aria-describedby")).toBe(tooltip.id);
}

test("describes the historical product-defined metric consistently", async () => {
  await renderCaseStudy();

  const text = normalize(container);
  expect(text).toContain(
    "p90 means 90% of page loads reached that milestone in this time or less; the slowest 10% took longer.",
  );
  expect(text).toContain(
    "It is distinct from Lighthouse’s legacy TTI metric, which Lighthouse 10 removed.",
  );
  expect(text).toContain(
    "For this phase, the critical query remained the floor on a cold load; further gains would have required optimizing or eliminating work inside it.",
  );
  expect(text).not.toContain("at least this fast");
  expect(text).not.toContain("can’t get faster than");
  expect(
    container.querySelector('a[href="https://web.dev/articles/tti"]'),
  ).toBeNull();

  expect(
    [...container.querySelectorAll(".case-study-stats dd")].map(normalize),
  ).toEqual(["6.8s to 4.6s", "5.3s to 2.1s", "5.9s to 2.8s"]);

  const visibleCaption = [...container.querySelectorAll("figcaption")].at(-1);
  const accessibleCaption = [...container.querySelectorAll("table caption")].at(
    -1,
  );
  expect(normalize(accessibleCaption)).toBe(normalize(visibleCaption));
  expect(normalize(visibleCaption)).toContain(
    "product-defined Time to Interactive (TTI)",
  );
});

test("touch toggles a definition and exposes its accessible relationship", async () => {
  await renderCaseStudy();
  const trigger = term("Request");
  const deferredTrigger = container.querySelector(".case-study-pill-term");

  expect(trigger).not.toBeUndefined();
  expect(trigger.tagName).toBe("BUTTON");
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(
    trigger.querySelector("a, button, input, select, textarea"),
  ).toBeNull();
  expect(normalize(deferredTrigger)).toBe("Request attributes");
  expect(deferredTrigger.tagName).toBe("BUTTON");
  expect(deferredTrigger.parentElement.tagName).toBe("LI");
  expect(container.querySelector(".case-study-tools dt button")).toBeNull();

  await tap(trigger);
  expectOpenDefinition(trigger, "purchase requisition");

  await tap(trigger);
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.body.querySelector('[role="tooltip"]')).toBeNull();
});

test("focus and activation expose a definition; Escape and outside press dismiss it", async () => {
  await renderCaseStudy();
  const trigger = term("Request");
  const outside = document.createElement("button");
  document.body.append(outside);

  await act(async () => trigger.focus());
  expectOpenDefinition(trigger, "purchase requisition");

  // A native button dispatches this click for Enter/Space in a browser.
  await act(async () => trigger.click());
  expectOpenDefinition(trigger, "purchase requisition");

  await act(async () => {
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Escape", bubbles: true }),
    );
  });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.activeElement).toBe(trigger);

  await tap(trigger);
  expectOpenDefinition(trigger, "purchase requisition");
  await act(async () => {
    outside.dispatchEvent(
      new PointerEvent("pointerdown", {
        bubbles: true,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
  });
  expect(trigger.getAttribute("aria-expanded")).toBe("false");
  expect(document.body.querySelector('[role="tooltip"]')).toBeNull();

  outside.remove();
});

test("mouse hover reveals a definition", async () => {
  await renderCaseStudy();
  const trigger = term("Request");

  await act(async () => {
    trigger.dispatchEvent(
      new PointerEvent("pointermove", {
        bubbles: true,
        pointerType: "mouse",
        isPrimary: true,
      }),
    );
    await new Promise((resolve) => setTimeout(resolve, 0));
  });

  expectOpenDefinition(trigger, "purchase requisition");
});

test("the phone Home link stays in document flow immediately before the article", async () => {
  await renderCaseStudy();

  const inner = container.querySelector(".resume-inner-container");
  const home = container.querySelector("a.case-study-home-link");
  const article = container.querySelector("article.resume-panel");

  expect(home.parentElement).toBe(inner);
  expect(home.nextElementSibling).toBe(article);
  expect(home.closest(".homePageBackLink, .resume-home-link")).toBeNull();
});
