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
    "Direct loads improved by about a third but still took 4.6 seconds at p90.",
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
    "Reported p90 time to usable by entry point, in seconds",
  );
});

test("identifies the measured baseline and preserves the historical-data limitations", async () => {
  await renderCaseStudy();

  const text = normalize(container);
  const notes = container.querySelector("#cs-measurement");
  expect(notes).not.toBeNull();
  expect(text).toContain(
    "compare the initially slow new page with that same redesigned page after optimization",
  );
  expect(text).toContain(
    "Most old tab routes had also been similarly slow, but that is context, not a separate measured baseline.",
  );
  expect(normalize(notes)).toContain(
    "The original measurement data is no longer available.",
  );
  expect(normalize(notes)).toContain(
    "sampling window, exact timer-start events, or treatment of errors and abandoned navigations",
  );
  expect(text).toContain(
    "the header, details panel, and first two relevant sections were interactive",
  );
  expect(text).toContain(
    "Rendering some cached text was a head start, not completion of that milestone.",
  );
  expect(container.querySelector('a[href="#cs-measurement"]')).not.toBeNull();
  expect(
    [...container.querySelectorAll("table")].at(-1).querySelectorAll("th")[1]
      .textContent,
  ).toBe("New page before optimization");
});

test("shows accessible dependency sequences without invented trace timings", async () => {
  await renderCaseStudy();

  const models = container.querySelector(".rdp-loading-models");
  const figure = models.closest("figure");
  const sequences = models.querySelectorAll("ol.rdp-sequence");
  expect(sequences.length).toBe(3);
  expect(models.closest('[aria-hidden="true"]')).toBeNull();
  for (const sequence of sequences) {
    expect(sequence.children.length).toBe(2);
    expect([...sequence.children].every((step) => step.tagName === "LI")).toBe(
      true,
    );
  }
  expect(normalize(models)).not.toMatch(/\b\d+(?:\.\d+)?\s*(?:s|seconds)\b/);
  expect(models.querySelector("[style], .rdp-chart-axis")).toBeNull();
  expect(container.querySelector('[class*="rdp-waterfall"]')).toBeNull();
  expect(normalize(figure)).toContain(
    "Illustrative dependencies; not to scale and not a trace.",
  );
  expect(normalize(figure)).toContain(
    "do not imply that every deferred request started after readiness",
  );
  expect(normalize(figure)).toContain(
    "or that the implementation used GraphQL @defer",
  );
  expect(models.querySelectorAll(".rdp-sequence-independent").length).toBe(2);
});

test("explains cache provenance, supported field selections, and readiness boundaries", async () => {
  await renderCaseStudy();

  const text = normalize(container);
  expect(text).toContain("Requests Search fetched request objects.");
  expect(text).toContain(
    "Approvals Search fetched a smaller set of fields for each approval’s linked request.",
  );
  expect(text).toContain(
    "A bill or vendor detail page could also leave related request data",
  );
  expect(text).toContain(
    "Complete supported field groups could render from cache while separate operations fetched the remaining data.",
  );
  expect(text).toContain(
    "Apollo’s normalized object identities make fields reusable across queries",
  );
  expect(text).toContain(
    "not automatic removal of cached fields from a network request",
  );
  expect(text).toContain(
    "Cache reuse explains earlier rendering, not freshness.",
  );
  expect(text).toContain(
    "a partial request was not enough to declare the destination ready",
  );
  expect(text).not.toContain("only fetch what's missing");
});

test("makes the default deferred sections conditional on the destination", async () => {
  await renderCaseStudy();

  const text = normalize(container);
  const sections = container.querySelector(
    'ul[aria-label="Default lower-priority sections"]',
  );
  expect([...sections.children].map(normalize)).toContain("Documents");
  expect(text).toContain(
    "A direct link to Documents promoted Documents into the critical set.",
  );
  expect(text).toContain("not unimportant or guaranteed to be out of view");
  expect(text).not.toContain("nobody’s waiting");
});

test("keeps the tool table in a native disclosure that starts collapsed", async () => {
  await renderCaseStudy();

  const disclosure = container.querySelector("details.case-study-disclosure");
  const summary = disclosure.firstElementChild;
  expect(disclosure.open).toBe(false);
  expect(disclosure.hasAttribute("open")).toBe(false);
  expect(summary.tagName).toBe("SUMMARY");
  expect(normalize(summary)).toBe("Tools used to validate the changes");
  expect(
    summary.querySelector("a, button, input, select, textarea"),
  ).toBeNull();
  expect(disclosure.querySelectorAll(".case-study-tools dt").length).toBe(5);
  expect(disclosure.querySelectorAll(".case-study-tools dd").length).toBe(5);
});

test("uses the editorial title, three specific tradeoffs, and a clear footer navigation", async () => {
  await renderCaseStudy();

  expect(normalize(container.querySelector("h1"))).toBe(
    "Everything on one page. The right things first.",
  );
  const takeaways = container.querySelectorAll(".case-study-takeaways > li");
  expect(takeaways.length).toBe(3);
  expect(
    [...takeaways].map((item) => normalize(item.querySelector("strong"))),
  ).toEqual([
    "Give cache reuse a boundary.",
    "Critical follows the destination.",
    "Cold loads have a different constraint.",
  ]);
  const footer = container.querySelector(".case-study-footer");
  const navigation = footer.querySelector('nav[aria-label="More from Andrew"]');
  expect([...navigation.querySelectorAll("a")].map(normalize)).toEqual([
    "About",
    "Back to Projects",
    "Email Andrew",
  ]);
  expect(navigation.querySelector('a[href="/about"]')).not.toBeNull();
  expect(
    navigation.querySelector('a[href="/projects-and-toys"]'),
  ).not.toBeNull();
  expect(
    navigation.querySelector('a[href^="mailto:andrew@hunt.codes"]'),
  ).not.toBeNull();
  expect(normalize(footer)).toContain("Related engineering work:");
  expect(normalize(container)).toContain(
    "browser Find across sections once their content has loaded",
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
