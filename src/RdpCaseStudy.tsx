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
 * — stat tiles, the entry-mix bars, dependency schematics,
 * the tool disclosure, the bar chart, the numbered takeaways —
 * layered on in App.scss ("Case study").
 *
 * The outcomes are reported historical figures, not revalidated measurements:
 * the original data is no longer available. The diagrams show dependencies,
 * not reconstructed trace timings. Nothing here is internal source, a
 * dashboard or a schema.
 */

/** Mirrors /about: overlap the tail of the arrival swoop rather than
 *  waiting it out */
const REVEAL_DELAY_MS = 1000;

/** Percentile reported in the historical write-up. The original measurement
 *  data is unavailable; do not infer trace durations from these aggregates. */
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
    given: "No request data in the in-memory client cache",
    strategy:
      "Fetch the data the destination needs for its first interaction. Other sections no longer have to hold up that milestone.",
  },
  {
    key: "requests",
    label: "From Requests Search",
    share: "30% of views",
    before: 5.3,
    after: 2.1,
    given: "Most of the top of the page already cached",
    strategy:
      "Render supported field groups from the request search result, while separate queries supply the remaining data needed for the first interaction.",
  },
  {
    key: "approvals",
    label: "From Approvals Search",
    share: "15% of views",
    before: 5.9,
    after: 2.8,
    given: "Part of the request already cached",
    strategy:
      "The approval result includes a smaller set of fields for its linked request. Reuse supported cached fields and fetch the remaining critical data.",
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

/** Dependency sketches, deliberately without durations or request-start times.
 *  The baseline is the consolidated page before optimization, not the old tabs. */
const LOADING_MODELS = [
  {
    key: "before",
    title: "Before optimization · new consolidated page",
    steps: [
      "Page queries include data beyond the first interaction",
      "Required responses hold up usable request content",
    ],
    independent: null,
  },
  {
    key: "after-direct",
    title: "After optimization · direct load",
    steps: [
      "Fetch critical data for the destination section",
      "Header, details, and first relevant sections become usable",
    ],
    independent: "Other sections load outside this readiness requirement.",
  },
  {
    key: "after-search",
    title: "After optimization · from Requests Search",
    steps: [
      "Render supported cached fields while fetching remaining critical data",
      "Header, details, and first relevant sections become usable",
    ],
    independent: "Other sections load outside this readiness requirement.",
  },
] as const;

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
    "Backend latency in production, per query",
  ],
  [
    "React Profiler",
    "Records which components rendered, how often, and why.",
    "Whether splitting queries introduced avoidable component re-renders",
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
    "Give cache reuse a boundary.",
    "Supporting a few known field selections keeps reuse understandable. Each additional partial-data shape is another case to reason about; more cache coverage is not free.",
  ],
  [
    "Critical follows the destination.",
    "Documents can wait on a general visit, but not when a link takes someone there to read a document. Screen position alone cannot decide what is critical.",
  ],
  [
    "Cold loads have a different constraint.",
    "With no request data in memory, the page still needs to fetch essential fields. The remaining direct-load time is a separate optimization problem; cache reuse on other paths cannot solve it.",
  ],
] as const;

/** Short explainers for the terms a reader outside Zip won't know */
const TIPS = {
  request:
    "A purchase requisition: someone asking to buy something, routed through approvals.",
  directLoad:
    "A page load with no request data in the in-memory client cache, such as an email link into a new app session. Browser assets or server responses may still be cached.",
  requestsSearch:
    "The Requests Search page: where users find and filter requests.",
  approvalsSearch:
    "The Approvals Search page: where users search over approvals. A request's workflow can include multiple approvals.",
  apollo:
    "Apollo Client, our GraphQL client. Its cache is what lets one page reuse data another page fetched.",
  fragments:
    "Reusable field selections in GraphQL. Apollo reuses fields stored under the same normalized object identity; sharing a fragment name does not itself make data reusable or trim a network request.",
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
              <h1 className="mt-0">
                Everything on one page. The right things first.
              </h1>
              <p className="case-study-lede">
                I led the redesign and near-complete rebuild of Zip&rsquo;s
                Request Details Page (RDP), its busiest page at 10,000+ daily
                views. This case study focuses on the loading architecture:
                reusing data from the previous screen and prioritizing the
                content people needed to act.
              </p>
              <p className="case-study-stats-note">
                Reported {PERCENTILE} time to usable, by entry point.{" "}
                <a className="inverse" href="#cs-measurement">
                  Baseline and measurement notes
                </a>
                .
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
                A <Term tip={TIPS.request}>Request</Term> in Zip tracks a
                purchase through approvals. Its details page brings together
                pricing, billing, documents, vendor information, and the
                conversations and decisions around that purchase.
              </p>
              <p>
                How people got to the page mattered a lot. A{" "}
                <Term tip={TIPS.directLoad}>direct load</Term> starts with no
                request data in the in-memory client cache. Someone coming from
                the <Term tip={TIPS.requestsSearch}>Requests Search</Term> or{" "}
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
                The old page made customers bounce between tabs to complete a
                single workflow. The redesign brought those sections onto one
                long, data-heavy page: less tab hopping, browser Find across
                sections once their content has loaded, and a comments sidebar
                beside the information being discussed.
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
                everything else that tab needed (lower-priority data included).
                Both queries ran concurrently, but request content waited for
                both responses. Tabs at least kept each fetch smaller than the
                whole page, but the loading strategy followed the UI structure,
                not what the user actually needed first. It also didn&rsquo;t
                reuse cached data well: if you came from Requests Search, the
                client already had a bunch of the request&rsquo;s fields, and
                the page waited for its own queries anyway.
              </p>
              <p>
                Consolidating the page didn&rsquo;t solve those waits on its
                own. The before/after figures below compare the initially slow
                new page with that same redesigned page after optimization. Most
                old tab routes had also been similarly slow, but that is
                context, not a separate measured baseline.
              </p>
              <p>
                The challenge was deciding which info had to be interactive
                first, what we could reuse from the previous screen, and what
                could load separately without blocking that first interaction.
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
                We defined &ldquo;time to usable&rdquo; around a concrete
                milestone: the header, details panel, and first two relevant
                sections were interactive. The destination link determined which
                sections mattered; the top of the page was the default.
                Rendering some cached text was a head start, not completion of
                that milestone. We compared direct loads and client-side
                arrivals from search separately.
              </p>
              <aside className="case-study-aside">
                <strong>{PERCENTILE} time to usable, in plain language.</strong>{" "}
                {PERCENTILE} means 90% of page loads reached that milestone in
                this time or less; the slowest 10% took longer. It describes the
                slow end, not the average.
              </aside>
              <aside className="case-study-aside" id="cs-measurement">
                <strong>About the reported results.</strong>
                <p>
                  These are historical {PERCENTILE} figures for the new page
                  before and after optimization, using the same intended
                  readiness milestone. The original measurement data is no
                  longer available. I can&rsquo;t revalidate the values,
                  sampling window, exact timer-start events, or treatment of
                  errors and abandoned navigations; this is not a reproducible
                  benchmark or a claim about every visit.
                </p>
                <p>
                  The team called this product-defined metric Time to
                  Interactive (TTI) in 2023. It is distinct from
                  Lighthouse&rsquo;s legacy TTI metric, which Lighthouse 10
                  removed.
                </p>
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
                    The previous page determines what is already cached.
                  </strong>{" "}
                  Requests Search fetched request objects. Approvals Search
                  fetched a smaller set of fields for each approval&rsquo;s
                  linked request. A bill or vendor detail page could also leave
                  related request data in <Term tip={TIPS.apollo}>Apollo</Term>
                  &rsquo;s cache before navigation to the RDP.
                </li>
              </ul>
              <p>
                Supporting every possible combination would have been a mess of
                loading states and dependencies between fields. So we balanced
                query complexity against performance by supporting a bounded set
                of <Term tip={TIPS.fragments}>GraphQL fragments</Term> used by
                the biggest referrers. Complete supported field groups could
                render from cache while separate operations fetched the
                remaining data. A missing or unsupported group still needed a
                fetch; we didn&rsquo;t try to handle every possible partial
                shape.
              </p>
              <p>
                Fragments describe field selections; Apollo&rsquo;s normalized
                object identities make fields reusable across queries. This was
                a change to query boundaries and rendering gates, not automatic
                removal of cached fields from a network request.
              </p>
              <p className="case-study-note">
                Cache reuse explains earlier rendering, not freshness. Data from
                the previous screen could still be stale, and a partial request
                was not enough to declare the destination ready. This account
                does not reconstruct the original refresh, invalidation, or
                approval-action safeguards.
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
                For a default arrival at the top of the page, these sections
                could sit outside the initial readiness requirement. A direct
                link to Documents promoted Documents into the critical set.
                &ldquo;Deferred&rdquo; meant not blocking that first
                interaction, not unimportant or guaranteed to be out of view:
              </p>
              <ul
                className="case-study-pills"
                aria-label="Default lower-priority sections"
              >
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
                <figcaption>What readiness depends on</figcaption>
                <p className="case-study-figure-note">
                  Illustrative dependencies; not to scale and not a trace.
                  Arrows show what readiness depends on, not when requests
                  start. Historical totals are shown separately in the results.
                </p>
                <div className="rdp-loading-models">
                  {LOADING_MODELS.map((model) => (
                    <div className="rdp-loading-model" key={model.key}>
                      <h4>{model.title}</h4>
                      <ol className="rdp-sequence">
                        {model.steps.map((step) => (
                          <li key={step}>{step}</li>
                        ))}
                      </ol>
                      {model.independent && (
                        <p className="rdp-sequence-independent">
                          {model.independent}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
                <p className="case-study-figure-note">
                  The original per-section scheduling triggers are not available
                  here. These sketches do not imply that every deferred request
                  started after readiness, or that the implementation used
                  GraphQL <code>@defer</code>.
                </p>
              </figure>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-validation">
              <p className="case-study-kicker">03 · Validation</p>
              <h2 id="cs-validation">Measure locally, verify in production</h2>
              <p>
                I checked the loading change from several angles: browser waits,
                query and cache behavior, component renders, and production
                usage.
              </p>
              <details className="case-study-disclosure">
                <summary>Tools used to validate the changes</summary>
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
              </details>
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
                The reported results show the largest reduction for arrivals
                from Requests Search, where cached fields could be reused.
                Direct loads improved by about a third but still took 4.6
                seconds at {PERCENTILE}. Query splitting left critical request
                data on that path; reaching the readiness milestone sooner did
                not make the remaining network work disappear.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  Reported {PERCENTILE} time to usable by entry point, in
                  seconds
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
                      New page · before optimization
                    </li>
                    <li>
                      <span className="rdp-swatch rdp-bar-after" />
                      New page · after optimization
                    </li>
                  </ul>
                </div>
                <div className="sr-only">
                  <table>
                    <caption>
                      Reported {PERCENTILE} time to usable by entry point, in
                      seconds
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Arriving from</th>
                        <th scope="col">New page before optimization</th>
                        <th scope="col">New page after optimization</th>
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
                <p className="case-study-figure-note">
                  Historical figures, not revalidated from original data.{" "}
                  <a className="inverse" href="#cs-measurement">
                    Measurement scope and limitations
                  </a>
                  .
                </p>
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
              <h2 id="cs-takeaways">Three tradeoffs I&rsquo;d carry forward</h2>
              <p>
                Making the page usable sooner meant drawing explicit boundaries,
                not making every section load as quickly as possible.
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
                Diagrams are high-level recreations, not production traces. No
                internal code, dashboards, or schemas are reproduced here.
              </p>
              <p>
                <strong>Related engineering work:</strong>{" "}
                <a
                  className="inverse"
                  href={ZIP_BLOG_POST_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Rewriting our component library with Material UI
                </a>
                .
              </p>
              <nav
                className="case-study-footer-links"
                aria-label="More from Andrew"
              >
                <Link className="inverse" to="/about">
                  About
                </Link>
                <Link className="inverse" to="/projects-and-toys">
                  Back to Projects
                </Link>
                <a
                  className="inverse"
                  href="mailto:andrew@hunt.codes?Subject=Request%20page%20case%20study"
                >
                  Email Andrew
                </a>
              </nav>
            </footer>
          </article>
        </div>
      </main>
    </>
  );
};

export default RdpCaseStudy;
