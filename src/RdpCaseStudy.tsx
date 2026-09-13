import React, { useEffect, useId, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircle } from "react-feather";
import { ArrowRight, Info } from "lucide-react";

import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";
import { ZIP_BLOG_POST_URL } from "./workLinks";

/**
 * /projects-and-toys/rdp-case-study: the Request Details Page performance case
 * study — the project Andrew led at Zip in 2023 that cut the page's
 * product-defined interaction-ready time by changing what loads first, not by
 * shaving render time. Filed under /projects-and-toys but a reading page, so it
 * borrows /about's shell: AppBackground gives the route the about view
 * (the Earth perch, the moon in the left gutter) and the panel wears
 * .resume-container / .resume-panel, with the case study's own furniture
 * — stat tiles, the entry-mix bars, the before/after flow, the mock
 * waterfalls, the tool list, the bar chart, the numbered takeaways —
 * layered on in App.scss ("Case study").
 *
 * The outcome numbers, the traffic mix and the rollout are the ones on
 * the record. The diagrams are recreations, the waterfalls are drawn to
 * the headline outcomes rather than from a trace (and say so), and the
 * descriptions stay high-level on purpose: nothing here is internal
 * source, a dashboard or a schema.
 */

/** Mirrors /about: overlap the tail of the arrival swoop rather than
 *  waiting it out */
const REVEAL_DELAY_MS = 1000;

/** The percentile every product-defined TTI figure on the page is quoted at.
 *  The source write-up says p90 throughout; if the dashboards said p95, this
 *  is the one place to change it. */
const PERCENTILE = "p90";

/** The Request Details Page's product-defined interaction-ready milestone, in
 *  seconds, split by where the visitor came from (a "Requests Search" row is
 *  the RDP's result for visitors arriving from Requests Search — not that
 *  page's), with the share of daily views each way in carried. The team called
 *  this metric TTI in 2023; it is not Lighthouse's legacy TTI metric. */
const ENTRY_POINTS = [
  {
    key: "direct",
    label: "Direct load",
    share: "30%+ of views",
    before: 6.8,
    after: 4.6,
    given: "Nothing cached yet",
    strategy:
      "Nothing's cached, so we still have to fetch what the first view needs. The win here was fetching only that and deferring the rest.",
  },
  {
    key: "requests",
    label: "From Requests Search",
    share: "30% of views",
    before: 5.3,
    after: 2.1,
    given: "Most of the top of the page already cached",
    strategy:
      "The search result already had most of what the top of the page shows. So we render from that right away and only fetch what's missing.",
  },
  {
    key: "approvals",
    label: "From Approvals Search",
    share: "15% of views",
    before: 5.9,
    after: 2.8,
    given: "Part of the request already cached",
    strategy:
      "The approval result had part of the picture. We reuse what we have and fetch the rest of what the first interaction needs.",
  },
] as const;

/** Where the page's 10k+ daily views came from — the mix that made three
 *  strategies worth their weight. The last row is the remainder, spread
 *  over various other pages. */
const ENTRY_MIX = [
  { label: "Direct load", share: 31, shown: "30%+" },
  { label: "From Requests Search", share: 30, shown: "30%" },
  { label: "From Approvals Search", share: 15, shown: "15%" },
  { label: "From other pages", share: 24, shown: "~25%" },
];
/** The mix bars are scaled to this share, not to 100%: the longest row
 *  is a third of the traffic, and a bar a third of the width read as
 *  "small" */
const MIX_MAX_SHARE = 40;

/** Sections that could arrive after the first useful interaction; a tip
 *  where the name alone doesn't say what's in it */
const DEFERRED_SECTIONS: { name: string; tip?: string }[] = [
  { name: "Documents" },
  { name: "Vendor details" },
  { name: "Payment" },
  {
    name: "Request attributes",
    tip: "Custom fields on a request, based on the company's intake form questions.",
  },
  { name: "Approval attributes" },
];

/**
 * Mock request waterfalls, one per headline number. Illustrative: the
 * bars are drawn so each panel lands on its headline outcome, and the
 * shape — a large shared query and the tab's own query both awaited
 * before; one critical fetch, render, then the deferred sections after;
 * and a render straight off the search data when arriving from search —
 * is the architecture, not a trace.
 */
type WaterfallKind = "shell" | "critical" | "render" | "deferred";
const WATERFALLS: {
  key: string;
  title: string;
  tti: number;
  rows: { label: string; start: number; end: number; kind: WaterfallKind }[];
}[] = [
  {
    key: "before",
    title: "Before · direct load",
    tti: 6.8,
    rows: [
      { label: "App shell (HTML + JS)", start: 0, end: 1.2, kind: "shell" },
      {
        label: "Page query (data shared across tabs)",
        start: 1.2,
        end: 4.4,
        kind: "critical",
      },
      {
        label: "Tab query (everything else the tab shows)",
        start: 1.2,
        end: 6.5,
        kind: "critical",
      },
      { label: "Render", start: 6.5, end: 6.8, kind: "render" },
    ],
  },
  {
    key: "after-direct",
    title: "After · direct load",
    tti: 4.6,
    rows: [
      { label: "App shell (HTML + JS)", start: 0, end: 1.2, kind: "shell" },
      {
        label: "Critical request data",
        start: 1.2,
        end: 3.6,
        kind: "critical",
      },
      {
        label: "Header, details, first sections",
        start: 3.6,
        end: 4.6,
        kind: "render",
      },
      { label: "Deferred sections", start: 4.6, end: 7, kind: "deferred" },
    ],
  },
  {
    key: "after-search",
    title: "After · from Requests Search",
    tti: 2.1,
    rows: [
      { label: "Client-side navigation", start: 0, end: 0.2, kind: "shell" },
      {
        label: "Header + details from search data",
        start: 0.2,
        end: 0.9,
        kind: "render",
      },
      {
        label: "Remaining critical data",
        start: 0.2,
        end: 1.8,
        kind: "critical",
      },
      { label: "First sections", start: 1.8, end: 2.1, kind: "render" },
      { label: "Deferred sections", start: 2.1, end: 4.4, kind: "deferred" },
    ],
  },
];
const WATERFALL_LEGEND: { kind: WaterfallKind; label: string }[] = [
  { kind: "shell", label: "App shell" },
  { kind: "critical", label: "Critical-path data" },
  { kind: "render", label: "Render" },
  { kind: "deferred", label: "Deferred (after RDP TTI)" },
];

/** Each tool, what it is, and the question it answered */
const TOOLS = [
  [
    "Chrome DevTools",
    "The browser's built-in profiler: network waterfall, main-thread activity, paint timings.",
    "Where a cold load spends its time",
  ],
  [
    "Apollo",
    "Apollo Client dev tools: queries in flight and the state of the cache.",
    "Which queries ran, when, and what came from cache",
  ],
  [
    "Datadog",
    "Production monitoring: latency and error dashboards per query, from real traffic.",
    "Real-world BE performance stats in prod, per query",
  ],
  [
    "React Profiler",
    "Records which components rendered, how often, and why.",
    "Ensuring that data was properly memoized, and that we weren't adding unnecessary re-renders by splitting up queries",
  ],
  [
    "FullStory",
    "Session replay and product analytics.",
    "How people actually used the new page",
  ],
] as const;

/** The calls that were Andrew's, as opposed to the team's */
const OWNED_DECISIONS = [
  [
    "Reusing search data.",
    "Treating the previous screen as a data source, so navigating from search doesn't behave like a cold page load.",
  ],
  [
    "The query boundaries.",
    "Which data is critical for the first interaction, and which sections can arrive later.",
  ],
  [
    "The workflow diagram.",
    "A full frontend rewrite of the diagram that shows a request's path through its approvals. It implemented the redesign, but also rendered faster than the old library and made the diagram more central to the page.",
  ],
] as const;

/** From the 2023 review cycle that covered the project: the manager's
 *  write-up and an anonymous peer review */
const TEAM_QUOTES = [
  [
    "We were having performance issues right before launch, and Andrew took the initiative to break queries into smaller pieces and delivered a significantly better user experience.",
    "Engineering manager, 2023 review",
  ],
  [
    "When there was some design churn he took on basically all the burden of the work and really protected the rest of the team from it.",
    "Peer engineer, anonymous 2023 review",
  ],
] as const;

const TAKEAWAYS = [
  [
    "Define the metric around the product experience.",
    "A useful product-specific TTI definition made prioritization concrete and prevented the team from optimizing the wrong milestone.",
  ],
  [
    "Treat navigation context as data.",
    "A user arriving from search may already have enough information to make the destination useful immediately.",
  ],
  [
    "Progressive loading is a product decision.",
    "Deferring content requires deciding which information is critical, not simply splitting queries mechanically.",
  ],
  [
    "Validate across the stack.",
    "Browser profiling, GraphQL instrumentation, production telemetry, and React render analysis answered different questions.",
  ],
] as const;

/** Short explainers for the terms a reader outside Zip won't know */
const TIPS = {
  request:
    "Zip's core object, aka a purchase requisition: someone asking to buy something, routed through approvals.",
  directLoad:
    "A fresh page load (typed URL, refresh, link from email or Slack). Nothing cached yet.",
  requestsSearch:
    "The Requests Search page: where users find and filter requests.",
  approvalsSearch:
    "The Approvals Search page: where users search over approvals. Each request's workflow has multiple approvals.",
  apollo:
    "Apollo Client, our GraphQL client. Its cache is what lets one page reuse data another page fetched.",
  fragments:
    "Reusable sets of fields in a GraphQL query. Shared fragments mean shared cached data.",
  designPartners:
    "A handful of customers who try new features early and give feedback.",
};

/** The time axes run to this many seconds — a round number past the
 *  slowest bar, so the ticks land on whole seconds */
const CHART_MAX_S = 8;
const AXIS_TICKS = [0, 2, 4, 6, 8];

const seconds = (s: number) => `${s.toFixed(1)}s`;
const timeShare = (s: number) => `${(s / CHART_MAX_S) * 100}%`;
const mixShare = (pct: number) => `${(pct / MIX_MAX_SHARE) * 100}%`;

/** The tooltip body the terms and pills share */
const Tip = ({ tip, id }: { tip: string; id: string }) => (
  <TooltipContent
    id={id}
    collisionPadding={12}
    className="case-study-term-tip px-3 py-1.5"
  >
    <p>{tip}</p>
  </TooltipContent>
);

/**
 * Shared operable definition: Radix supplies hover, focus, Escape and
 * assistive tooltip semantics; the controlled state extends that primitive
 * with a reliable click/tap toggle.
 */
const DefinitionTrigger = ({
  tip,
  children,
  className,
}: {
  tip: string;
  children: React.ReactNode;
  className: string;
}) => {
  const [open, setOpen] = useState(false);
  const contentId = useId();
  const triggerRef = useRef<HTMLButtonElement>(null);
  const wasOpenAtPointerDown = useRef(false);

  // Radix dismisses on outside interaction, but doing this on pointerdown
  // makes tap-off immediate instead of waiting for the compatibility click.
  useEffect(() => {
    if (!open) return;
    const closeOnOutsidePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      const content = document.getElementById(contentId);
      if (
        !target ||
        triggerRef.current?.contains(target) ||
        content?.contains(target)
      )
        return;
      setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsidePointerDown);
    return () =>
      document.removeEventListener("pointerdown", closeOnOutsidePointerDown);
  }, [contentId, open]);

  return (
    <Tooltip open={open} onOpenChange={setOpen}>
      <TooltipTrigger asChild>
        <button
          ref={triggerRef}
          type="button"
          className={`case-study-definition ${className}`}
          aria-expanded={open}
          aria-controls={open ? contentId : undefined}
          onPointerDown={() => {
            // Radix closes an open tooltip before click, so remember the
            // pre-pointer state and make the following click authoritative.
            wasOpenAtPointerDown.current = open;
          }}
          onClick={(event) => {
            // Prevent Radix's composed close-on-click from undoing our toggle.
            event.preventDefault();
            // Keyboard and assistive-tech clicks have no pointerdown. Focus
            // already opens the definition; activation must keep it exposed.
            setOpen(event.detail === 0 || !wasOpenAtPointerDown.current);
          }}
        >
          {children}
          <Info aria-hidden="true" size={14} />
        </button>
      </TooltipTrigger>
      <Tip tip={tip} id={contentId} />
    </Tooltip>
  );
};

/** A defined term in running text: bold italic text and its info glyph form
 *  one semantic button, without nested interactive controls. */
export const Term = ({
  tip,
  children,
}: {
  tip: string;
  children: React.ReactNode;
}) => (
  <DefinitionTrigger tip={tip} className="case-study-term">
    <em>
      <strong>{children}</strong>
    </em>
  </DefinitionTrigger>
);

const FlowArrow = () => (
  <ArrowRight className="rdp-flow-arrow" aria-hidden="true" size={20} />
);

const TimeAxis = () => (
  <div className="rdp-chart-axis">
    {AXIS_TICKS.map((tick) => (
      <span key={tick} style={{ left: timeShare(tick) }}>
        {tick}s
      </span>
    ))}
  </div>
);

const RdpCaseStudy = () => {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <main
        className="resume-container case-study"
        style={{ opacity: shown ? 1 : 0 }}
      >
        <div className="resume-inner-container">
          {/* Keep Home in the document flow at every width so it scrolls away
              instead of covering headings, charts or focused controls. */}
          <Link
            className="case-study-home-link back-to-home-link flex w-fit items-center gap-4 mb-6 inverse -ml-8"
            to="/home"
          >
            <ArrowLeftCircle size={40} />
            Home
          </Link>
          <article className="resume-panel">
            <header>
              <p className="case-study-crumbs">
                <Link className="inverse" to="/projects-and-toys">
                  Projects &amp; toys
                </Link>
                <span aria-hidden="true">/</span>
                <span>Case study</span>
              </p>
              <h1 className="mt-0">Making a complex request page feel fast</h1>
              <p className="case-study-lede">
                This project involved a redesign and near-complete rebuild of
                Zip&rsquo;s Request Details Page (RDP), the product&rsquo;s
                most-accessed page at 10k+ views a day. This write-up covers one
                piece of it: the loading architecture, which prioritized the
                content users needed first, reused data from search entry
                points, and progressively loaded lower-priority sections.
              </p>
              <p className="case-study-stats-note">
                RDP {PERCENTILE} product-defined Time to Interactive (TTI),
                broken down by how users got there
              </p>
              <dl className="case-study-stats">
                {ENTRY_POINTS.map((entry) => (
                  <div key={entry.key}>
                    <dt>{entry.label}</dt>
                    <dd>
                      <span className="case-study-before">
                        {seconds(entry.before)}
                      </span>
                      <span className="sr-only"> to </span>
                      <ArrowRight aria-hidden="true" size={22} />
                      <span className="case-study-after">
                        {seconds(entry.after)}
                      </span>
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="case-study-facts">
                <span className="pill tool-pill">Frontend performance</span>
                <span className="pill tool-pill">Technical leadership</span>
                <span>
                  Zip · 2023 · 5 months · project lead · 2 designers, 1 PM, 5
                  engineers (3 frontend)
                </span>
              </p>
            </header>

            <div className="resume-divider" />

            <section aria-labelledby="cs-context">
              <p className="case-study-kicker">01 · Context</p>
              <h2 id="cs-context">
                The Request Details Page sat at the center of a complex
                enterprise workflow
              </h2>
              <p>
                A <Term tip={TIPS.request}>Request</Term> in Zip is a purchase
                request working its way through approvals and cross-functional
                workflows. The Request Details Page (RDP) pulls together lots of
                information about a request: details from the initial request,
                pricing and purchase info, billing details, linked documents,
                request-related chat messages, and information requested from
                the vendor.
              </p>
              <p>
                How people got to the page mattered a lot. A{" "}
                <Term tip={TIPS.directLoad}>direct load</Term> starts with
                nothing cached. Someone coming from the{" "}
                <Term tip={TIPS.requestsSearch}>Requests Search</Term> or{" "}
                <Term tip={TIPS.approvalsSearch}>Approvals Search</Term> pages
                already has some of the request&rsquo;s data on the client.
              </p>
              <figure className="case-study-figure">
                <figcaption>Where a day&rsquo;s views came from</figcaption>
                <div className="rdp-chart" aria-hidden="true">
                  {ENTRY_MIX.map((row) => (
                    <React.Fragment key={row.label}>
                      <span className="rdp-chart-label">{row.label}</span>
                      <div className="rdp-chart-bars">
                        <div
                          className="rdp-bar rdp-bar-after"
                          style={{ width: mixShare(row.share) }}
                        >
                          <span>{row.shown}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                </div>
                <div className="sr-only">
                  <table>
                    <caption>Share of daily views by entry point</caption>
                    <thead>
                      <tr>
                        <th scope="col">Arriving from</th>
                        <th scope="col">Share of views</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ENTRY_MIX.map((row) => (
                        <tr key={row.label}>
                          <th scope="row">{row.label}</th>
                          <td>{row.shown}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
              <h3>The trigger</h3>
              <p>
                By 2023, the Request Details Page had a lot of overdue technical
                and design debt. It was split into tabs, and many
                customers&rsquo; workflows involved bouncing between several of
                them. So the redesign turned it into one long, data-heavy page.
                Pros: less navigation, Cmd+F works across everything, and
                comments moved to a sidebar so you can comment while looking at
                the thing you&rsquo;re referencing.
              </p>
              <p>
                We kept the tabs in the UI, but as links that auto-scroll to
                that section. That also meant other pages could (and did) link
                directly into a specific section. The catch: a page that shows
                everything at once still has to feel fast.
              </p>
              <h3>The original loading model</h3>
              <p>
                The old page ran one large query for the header and the data
                shared across tabs, plus a second, tab-specific query for
                everything else that tab needed (low-priority stuff included).
                You waited on both before seeing anything. Tabs at least kept
                each fetch smaller than the whole page, but the loading strategy
                followed the UI structure, not what the user actually needed
                first. It also didn&rsquo;t reuse cached data well: if you came
                from Requests Search, the client already had a bunch of the
                request&rsquo;s fields, and the page waited for its own queries
                anyway.
              </p>
              <figure className="case-study-figure">
                <figcaption>Loading architecture, before and after</figcaption>
                <div className="rdp-flow">
                  <span className="rdp-flow-label">Before</span>
                  <div className="rdp-flow-row">
                    <div className="rdp-node-stack">
                      <div className="rdp-node rdp-node-root">
                        Page query
                        <small>header + data shared across tabs</small>
                      </div>
                      <div className="rdp-node rdp-node-root">
                        Tab query
                        <small>everything else the tab shows</small>
                      </div>
                    </div>
                    <FlowArrow />
                    <div className="rdp-node">
                      Tab renders
                      <small>only once both are back</small>
                    </div>
                  </div>
                  <p className="rdp-flow-note">
                    Each tab waited on both the big shared query and its own
                    query (low-pri data included) before rendering.
                  </p>
                </div>
                <div className="rdp-flow">
                  <span className="rdp-flow-label">After</span>
                  <div className="rdp-flow-row">
                    <div className="rdp-node rdp-node-root">
                      Critical request data
                      <small>for immediate interaction</small>
                    </div>
                    <FlowArrow />
                    <div className="rdp-node-stack">
                      <div className="rdp-node">Header + details panel</div>
                      <div className="rdp-node">First visible sections</div>
                    </div>
                    <FlowArrow />
                    <div className="rdp-node rdp-node-deferred">
                      Deferred sections
                      <small>loaded progressively</small>
                    </div>
                  </div>
                  <p className="rdp-flow-note">
                    Load what the first interaction needs, defer the rest.
                  </p>
                </div>
              </figure>
              <p>
                The challenge was deciding which info had to be interactive
                first, what we could reuse from the previous screen, and what
                could load later without blocking anyone.
              </p>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-approach">
              <p className="case-study-kicker">02 · Approach</p>
              <h2 id="cs-approach">
                Define performance around the user&rsquo;s first useful
                interaction
              </h2>
              <p>
                To focus our perf efforts on improving the user&rsquo;s ability
                to get their specific work done, we defined a product-specific
                interaction-ready milestone: the moment the header, details
                panel, and first two relevant sections were interactive. The
                team called it Time to Interactive (TTI) in 2023. It is distinct
                from Lighthouse&rsquo;s legacy TTI metric, which Lighthouse 10
                removed. Our definition gave us a concrete constraint: make the
                stuff people actually need first fast.
              </p>
              <aside className="case-study-aside">
                <strong>
                  {PERCENTILE} product-defined TTI, in plain language.
                </strong>{" "}
                {PERCENTILE} means 90% of page loads reached that milestone in
                this time or less; the slowest 10% took longer. It describes the
                slow end, not the average.
              </aside>
              <h3>Where it got hairy</h3>
              <p>
                Two things made this more complicated than just splitting up a
                query:
              </p>
              <ul className="case-study-list">
                <li>
                  <strong>&ldquo;Usable&rdquo; depends on the link.</strong>{" "}
                  People come to the RDP to interact with different parts of it,
                  and links from around Zip drop them into different sections.
                  If you clicked a link to the Documents section, you want
                  Documents first. So the definition of &ldquo;usable&rdquo;
                  changed depending on the link, and the top of the page was
                  just the default.
                </li>
                <li>
                  <strong>
                    Every referrer has a different subset of the data cached.
                  </strong>{" "}
                  Multiple search pages and other object pages link to the RDP,
                  and each one leaves a different slice of the request in{" "}
                  <Term tip={TIPS.apollo}>Apollo</Term>&rsquo;s cache.
                </li>
              </ul>
              <p>
                Supporting every possible combination would have been a mess of
                loading states and dependencies between fields. So we balanced
                query complexity against performance: the RDP renders from cache
                for a limited set of{" "}
                <Term tip={TIPS.fragments}>GraphQL fragments</Term> (the ones
                the biggest referrers use) and fetches everything else.
              </p>
              <h3>Three entry points, three strategies</h3>
              <ul className="case-study-cards">
                {ENTRY_POINTS.map((entry) => (
                  <li key={entry.key}>
                    <strong>{entry.label}</strong>
                    <span className="case-study-card-given">
                      {entry.share} · {entry.given}
                    </span>
                    <p>{entry.strategy}</p>
                  </li>
                ))}
              </ul>
              <p>
                Lower-priority sections load after the first interaction is
                ready. They&rsquo;re below the fold anyway, so nobody&rsquo;s
                waiting on them:
              </p>
              <ul className="case-study-pills" aria-label="Deferred sections">
                {DEFERRED_SECTIONS.map(({ name, tip }) =>
                  tip ? (
                    <li
                      className="case-study-definition-pill pill tool-pill"
                      key={name}
                    >
                      <DefinitionTrigger
                        className="case-study-pill-term"
                        tip={tip}
                      >
                        {name}
                      </DefinitionTrigger>
                    </li>
                  ) : (
                    <li className="pill tool-pill" key={name}>
                      {name}
                    </li>
                  ),
                )}
              </ul>
              <figure className="case-study-figure">
                <figcaption>
                  What the critical path looked like, before and after
                </figcaption>
                <div aria-hidden="true">
                  {WATERFALLS.map((panel) => (
                    <div className="rdp-waterfall" key={panel.key}>
                      <span className="rdp-waterfall-title">{panel.title}</span>
                      {panel.rows.map((row, i) => (
                        <React.Fragment key={row.label}>
                          <span className="rdp-waterfall-label">
                            {row.label}
                          </span>
                          <div className="rdp-waterfall-track">
                            <div
                              className={`rdp-waterfall-bar rdp-waterfall-${row.kind}`}
                              style={{
                                left: timeShare(row.start),
                                width: timeShare(row.end - row.start),
                              }}
                            />
                            {/* The product-defined TTI marker, a segment per track that
                                overshoots the row gap so they read as one
                                line; the label rides the first */}
                            <span
                              className="rdp-waterfall-tti"
                              style={{ left: timeShare(panel.tti) }}
                            >
                              {i === 0 && <em>RDP TTI {seconds(panel.tti)}</em>}
                            </span>
                          </div>
                        </React.Fragment>
                      ))}
                      <TimeAxis />
                    </div>
                  ))}
                  <ul className="rdp-chart-legend">
                    {WATERFALL_LEGEND.map((item) => (
                      <li key={item.kind}>
                        <span
                          className={`rdp-swatch rdp-waterfall-${item.kind}`}
                        />
                        {item.label}
                      </li>
                    ))}
                    <li>
                      <span className="rdp-swatch rdp-swatch-tti" />
                      Product-defined Time to Interactive (TTI)
                    </li>
                  </ul>
                </div>
                <p className="sr-only">
                  Illustrative waterfalls. Before, on a direct load, a large
                  page-level query and the tab&rsquo;s own query both had to
                  finish before anything rendered, and the page reached the
                  product-defined TTI milestone at 6.8 seconds. After, one
                  critical request query then a render reached the milestone at
                  4.6 seconds, with the deferred sections loading afterwards.
                  Arriving from Requests Search, the header and details rendered
                  from the search data while the rest of the critical data
                  loaded, and the page reached the milestone at 2.1 seconds.
                </p>
                <p className="case-study-figure-note">
                  Timings are illustrative (drawn to match the {PERCENTILE}{" "}
                  numbers, not from a real trace). It&rsquo;s the shape that
                  matters.
                </p>
              </figure>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-validation">
              <p className="case-study-kicker">03 · Validation</p>
              <h2 id="cs-validation">Measure locally, verify in production</h2>
              <p>No single tool tells the whole story, so I used a few:</p>
              <dl className="case-study-tools">
                {TOOLS.map(([tool, what, answered]) => (
                  <div key={tool}>
                    <dt>{tool}</dt>
                    <dd>
                      <span className="case-study-tool-description">
                        {what}
                      </span>
                      {answered}
                    </dd>
                  </div>
                ))}
              </dl>
              <h3>Leadership scope</h3>
              <p>
                I led the project: 2 designers, 1 PM, and 5 engineers (3
                frontend) over ~5 months in 2023. As an IC, I contributed 50% of
                the frontend features. This query optimization was one part of
                that work. A big part of the job was lining up the
                product&rsquo;s information hierarchy with the loading strategy,
                so that what users needed first was an explicit engineering
                priority instead of an accident of tab boundaries.
              </p>
              <p>Decisions I owned:</p>
              <ul className="case-study-list">
                {OWNED_DECISIONS.map(([title, body]) => (
                  <li key={title}>
                    <strong>{title}</strong> {body}
                  </li>
                ))}
              </ul>
              <h3>Rollout</h3>
              <p>
                We launched over ~3 months:{" "}
                <Term tip={TIPS.designPartners}>design partner</Term> customers
                first, then an opt-in beta, then non-enterprise customers, then
                everyone. Many customers asked to be switched over early after
                hearing about the new version.
              </p>
              <p>
                I pushed for product tours for the launch, and built the
                FullStory dashboards we used to track adoption.
              </p>
              <h3>Outcome</h3>
              <p>
                The biggest win was coming from search: the page already had
                most of what it needed, so it stopped waiting. Direct loads
                improved by about a third. For this phase, the critical query
                remained the floor on a cold load; further gains would have
                required optimizing or eliminating work inside it.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  RDP {PERCENTILE} product-defined Time to Interactive (TTI) by
                  entry point, in seconds
                </figcaption>
                {/* The bars are decoration for the table below them, which
                    is what a screen reader gets. The sr-only class sits on a
                    wrapper div, not the table: a table ignores the 1px width
                    and lays out at content width, wide enough to scroll the
                    page sideways on phones. */}
                <div className="rdp-chart" aria-hidden="true">
                  {ENTRY_POINTS.map((entry) => (
                    <React.Fragment key={entry.key}>
                      <span className="rdp-chart-label">{entry.label}</span>
                      <div className="rdp-chart-bars">
                        <div
                          className="rdp-bar rdp-bar-before"
                          style={{ width: timeShare(entry.before) }}
                        >
                          <span>{seconds(entry.before)}</span>
                        </div>
                        <div
                          className="rdp-bar rdp-bar-after"
                          style={{ width: timeShare(entry.after) }}
                        >
                          <span>{seconds(entry.after)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  <TimeAxis />
                  <ul className="rdp-chart-legend">
                    <li>
                      <span className="rdp-swatch rdp-bar-before" />
                      Before
                    </li>
                    <li>
                      <span className="rdp-swatch rdp-bar-after" />
                      After
                    </li>
                  </ul>
                </div>
                <div className="sr-only">
                  <table>
                    <caption>
                      RDP {PERCENTILE} product-defined Time to Interactive (TTI)
                      by entry point, in seconds
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Arriving from</th>
                        <th scope="col">Before</th>
                        <th scope="col">After</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ENTRY_POINTS.map((entry) => (
                        <tr key={entry.key}>
                          <th scope="row">{entry.label}</th>
                          <td>{seconds(entry.before)}</td>
                          <td>{seconds(entry.after)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
              <h3>What my team said</h3>
              <ul className="case-study-quotes">
                {TEAM_QUOTES.map(([quote, who]) => (
                  <li key={who}>
                    <blockquote>
                      <p>&ldquo;{quote}&rdquo;</p>
                      <footer>{who}</footer>
                    </blockquote>
                  </li>
                ))}
              </ul>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-takeaways">
              <p className="case-study-kicker">04 · Takeaways</p>
              <h2 id="cs-takeaways">
                The optimization was architectural, not cosmetic
              </h2>
              <p>
                The biggest improvement didn&rsquo;t come from shaving
                milliseconds off render code. It came from changing what we
                load, and when: from UI tabs and page boundaries to whatever the
                user&rsquo;s next interaction actually needs. Slapping a spinner
                on the old model wouldn&rsquo;t have gotten us there.
              </p>
              <ol className="case-study-takeaways">
                {TAKEAWAYS.map(([title, body]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    {body}
                  </li>
                ))}
              </ol>
            </section>

            <div className="resume-divider" />

            <footer className="case-study-footer">
              <p className="case-study-note">
                <strong>Note:</strong> the diagrams are recreations and the
                details are intentionally high-level. No internal code,
                dashboards, or schemas here.
              </p>
              <p>
                More from my time at Zip:{" "}
                <a
                  className="inverse"
                  href={ZIP_BLOG_POST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rewriting our component library with Material UI
                </a>
                . More about me on the{" "}
                <Link className="inverse" to="/about">
                  about page
                </Link>
                . Questions? Email me at{" "}
                <a
                  className="inverse"
                  href="mailto:andrew@hunt.codes?Subject=Request%20page%20case%20study"
                >
                  andrew@hunt.codes
                </a>
                .
              </p>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
};

export default RdpCaseStudy;
