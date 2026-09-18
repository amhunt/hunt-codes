import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircle } from "react-feather";

import { RDP_CASE_STUDY_PATH } from "./routes";
import announcementArt from "./assets/brand2/announcement-before-after.svg";
import requestPageOldNew from "./assets/brand2/request-page-old-new.webp";

// Keep the public reference in docs/case-studies/brand-2.md in sync with this
// page. The copy-coverage test includes captions, image descriptions and links.

/** Zip's own telling of the rebrand, from its brand design lead — the
 *  marketing side of the same project */
const ZIP_BRAND_STORY_URL = "https://zip.com/blog/zip-brand-story";

/** The headline counts */
const STATS = [
  { key: "rebuilt", label: "Components rebuilt", value: "~20" },
  { key: "restyled", label: "Components restyled", value: "100+" },
  { key: "retired", label: "Duplicate components retired", value: "~12" },
] as const;

/** How the app was made to run both brands at once */
const MECHANICS = [
  [
    "A main brand flag, plus independent controls.",
    "isBrand2 selected the main brand experience. Date pickers, dropdown inputs and the launch announcement had separate flags, so they could ship or hold on their own schedules. Not every related fix depended on the brand flag.",
  ],
  [
    "A toggle for customers, with feedback attached.",
    "The broad opt-in phase let customers switch brands themselves. The customer toggle also provided a feedback form during the wider rollout.",
  ],
  [
    "Query params for testing.",
    "The b1 and b2 query parameters let reviewers select a brand from a review link, making it easier to compare the same change in both experiences.",
  ],
  [
    "Snapshots of both worlds.",
    "During migration, a second Chromatic job ran the Storybook suite under the new brand alongside the original suite. On October 24, near GA, we switched the primary job to Brand 2 and removed the duplicate job. Dual-brand snapshots did not continue through code retirement.",
  ],
  [
    "MUI underneath.",
    "ZSidePanel moved to MUI Drawer; other modal components already used MUI. The pill select already used MUI Select, and we simplified its API. We also switched text skeletons to MUI’s text variant on targeted surfaces. Shared primitives reduced custom behavior, but focus and layering still needed integration testing.",
  ],
] as const;

/** The rollout, in rings */
const MILESTONES = [
  [
    "Jul 2024",
    "The new logo lands in the codebase and the migration starts behind the flag.",
  ],
  [
    "Aug",
    "Design partners go first. Dual-brand Storybook snapshots begin after a failed initial setup and a retry.",
  ],
  ["Late Aug to Sep", "Beta: about 30 companies, in two tranches."],
  ["Sep 24", "Broad opt-in opens with a customer toggle and welcome modal."],
  [
    "Oct 24",
    "The primary Chromatic job switches to Brand 2; the duplicate job is removed.",
  ],
  [
    "Oct 25",
    "Main-product general availability. Replacement date pickers remain separately gated; Discover follows later.",
  ],
  ["Oct 28", "Zip publishes the brand story."],
  ["Early Nov", "Discover follows, the last surface in my rollout account."],
  ["Nov 18", "The first numbered cleanup PR merges, ahead of toggle removal."],
  [
    "Nov 21",
    "Customer toggle-removal milestone; the PR removing the toggle code merges November 23.",
  ],
  ["Dec 9", "The PR removing the last isBrand2 references merges."],
  [
    "Jan 10, 2025",
    "The ninth numbered cleanup PR merges, not the end of all Brand work.",
  ],
  [
    "Jan 13–14",
    "Follow-through continues: shared upload components reach four surfaces, followed by sandbox navigation and theme-color cleanup.",
  ],
] as const;

/** The selected numbered cleanup series, not all project changes. */
const CLEANUP = [
  { label: "1 · Alerts and toasts", removed: 611, added: 126 },
  { label: "2 · Find-and-replace pass", removed: 1118, added: 409 },
  { label: "3 · Brand-name references", removed: 3115, added: 643 },
  { label: "4 · Announcement and toggle", removed: 4575, added: 756 },
  { label: "5 · Library-folder styles", removed: 2463, added: 554 },
  { label: "6 · Last isBrand2 references", removed: 1566, added: 573 },
  { label: "7 · ZButton size aliases", removed: 1326, added: 477 },
  { label: "8 · No-op props", removed: 451, added: 232 },
  { label: "9 · Color constants", removed: 727, added: 359 },
];
const CLEANUP_MAX_LINES = 5000;
const CLEANUP_TOTAL = CLEANUP.reduce((sum, pr) => sum + pr.removed, 0);
const CLEANUP_ADDED = CLEANUP.reduce((sum, pr) => sum + pr.added, 0);

/** Andrew's project account; implementation was collaborative. */
const OWNED_DECISIONS = [
  "Keeping both brands in the main application, rather than accumulating the redesign on a long-lived branch.",
  "Owning the second Chromatic configuration during dual-brand development.",
  "Using MUI primitives for shared overlays, including the side-panel migration.",
  "Implementing finer rollout controls with the team, plus the customer toggle and feedback path.",
  "Per-environment favicons to make development and production tabs easier to distinguish.",
  "The find-and-replace cleanup strategy, backed by type checks, visual review and follow-up fixes.",
  "Most of the changes to the core component library itself.",
];

const TAKEAWAYS = [
  [
    "Use the rebrand as an opening, not a blank check.",
    "Customers were already preparing for a different experience, which created room for related UX improvements. Behaviorally risky replacements still needed separate rollout decisions.",
  ],
  [
    "Let early cohorts inform the next release.",
    "Customers willing to try the new experience helped us find issues before wider rollout. By general availability, early cohorts had used the new brand for roughly two months.",
  ],
  [
    "Snapshot both worlds.",
    "Dual-brand visual diffs made appearance changes inspectable during migration. They did not cover every application usage or replace behavioral testing, and we retired the extra job near GA.",
  ],
  [
    "Code retirement is a separate deliverable.",
    "The last isBrand2 references were removed on December 9, under three weeks after the customer toggle-removal milestone. Cleanup had started earlier and broader adoption work continued in January. Next time, I would make removal criteria and ownership explicit from the start.",
  ],
  [
    "Use the moment to dedupe.",
    "Migrating shared call sites gave us an opportunity to retire roughly a dozen duplicates and simplify the APIs teams would use afterward.",
  ],
] as const;

const share = (n: number, max: number) => `${(n / max) * 100}%`;
const lines = (n: number) => n.toLocaleString("en-US");

const Brand2CaseStudy = () => {
  return (
    <>
      <main className="resume-container case-study">
        <div className="resume-inner-container">
          {/* Keep Home in the document flow at every width so it scrolls away
              instead of covering headings, charts or focused controls. */}
          <Link
            className="case-study-home-link back-to-home-link flex w-fit items-center gap-4 mb-6 inverse -ml-8"
            to="/home"
          >
            <ArrowLeftCircle aria-hidden="true" size={40} />
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
                Rebranding a live enterprise app, one flag at a time
              </h1>
              <p className="case-study-lede">
                I was the engineering lead for Zip&rsquo;s Brand 2.0 product
                migration: a marketing rebrand that became a component-library
                and UX overhaul. We kept both brands in the live application,
                rolled the new experience out in customer cohorts, and treated
                retiring the old code as a separate phase. The hard part was
                changing shared component contracts while teams and customers
                still depended on them.
              </p>
              <dl className="case-study-stats">
                {STATS.map((stat) => (
                  <div key={stat.key}>
                    <dt>{stat.label}</dt>
                    <dd>
                      <span className="case-study-after">{stat.value}</span>
                    </dd>
                  </div>
                ))}
                <div>
                  <dt>isBrand2 references left · Dec 9</dt>
                  <dd>
                    <span className="case-study-after">0</span>
                  </dd>
                </div>
              </dl>
              <p className="case-study-note">
                Component counts are my approximate project-wide totals, not
                individual output; the categories may overlap. The
                zero-reference endpoint comes from the December 9 cleanup PR.
              </p>
              <p className="case-study-facts">
                <span className="pill tool-pill">Design systems</span>
                <span className="pill tool-pill">Migrations</span>
                <span className="pill tool-pill">Technical leadership</span>
                <span>Zip · Jul 2024 to Jan 2025</span>
                <span>Role: project engineering lead</span>
                <span>
                  Team: designers and frontend engineers across product teams
                </span>
              </p>
              <nav
                className="case-study-footer-links"
                aria-label="In this case study"
              >
                <a className="inverse" href="#cs-context">
                  Context
                </a>
                <a className="inverse" href="#cs-approach">
                  Engineering approach
                </a>
                <a className="inverse" href="#cs-rollout">
                  Rollout and cleanup
                </a>
                <a className="inverse" href="#cs-takeaways">
                  Takeaways
                </a>
              </nav>
            </header>

            <div className="resume-divider" />

            <section aria-labelledby="cs-context">
              <p className="case-study-kicker">01 · Context</p>
              <h2 id="cs-context">A rebrand that became a revamp</h2>
              <p>
                Brand 2.0 began as a brand and marketing effort: a new logo, a
                new palette, new type. On the product side, it created room for
                a component-library rebuild that I remember the frontend team
                wanting for years. Customers were already preparing for a
                different experience, so we could propose related UX changes
                alongside the visual refresh. That was an opportunity, not a
                reason to ship every behavior change at once.
              </p>
              <p>
                The result was effectively a revamp of the whole web app: a new
                design system, Birch, replacing Aspen; around twenty core
                components rebuilt from scratch and more than a hundred
                restyled; a dozen duplicate library components retired; and a
                long list of customer-requested improvements folded in. I
                remember customers who heard about it early asking to switch
                ahead of their scheduled cohort. That was encouraging feedback,
                not a measured adoption result.
              </p>
              <p>
                Zip&rsquo;s brand team told the marketing side of the story in{" "}
                <a
                  className="inverse"
                  href={ZIP_BRAND_STORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Designing the flow of business
                </a>
                : a brand built on two ideas, flow and peak, a wordmark drawn
                from motion, and a palette revised with accessibility in mind.
                That describes the design intent, not a product-wide compliance
                result. The post also says the designers folded the new language
                straight into the product, paying down design debt and refining
                the core components as they went. This page is the engineering
                side of that sentence: how we changed a live application through
                an incremental customer transition.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  The request page in Aspen and in Birch, from Zip&rsquo;s
                  launch materials. These are different example requests, not a
                  controlled before-and-after usability comparison.
                </figcaption>
                <img
                  className="case-study-compare"
                  src={requestPageOldNew}
                  width={2400}
                  height={1426}
                  loading="lazy"
                  decoding="async"
                  alt="Different example requests in Aspen and Birch. Old: compact header, status pills, tabs and small workflow cards on a grey grid. New: larger type and spacing, integration task pills, larger workflow cards with status dropdowns and an Approve button, on a deep blue backdrop."
                />
              </figure>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-approach">
              <p className="case-study-kicker">02 · Approach</p>
              <h2 id="cs-approach">
                One codebase, independent rollout controls
              </h2>
              <p>
                As I recall, our largest enterprise customers wanted roughly
                three months from alpha through beta to launch, with little
                tolerance for disruption. A long-lived redesign branch would
                concentrate integration risk. Keeping both experiences in the
                main application let us merge incrementally and expose the new
                brand to successive cohorts. Early customers willing to try it
                helped us find issues before the more cautious cohorts joined.
                The cost was temporary branching in shared code, more visual
                review, and an explicit cleanup phase.
              </p>
              <h3>How it ran both ways</h3>
              <ul className="case-study-cards">
                {MECHANICS.map(([title, body]) => (
                  <li key={title}>
                    <strong>{title}</strong>
                    <p>{body}</p>
                  </li>
                ))}
              </ul>
              <h3>A typography change was an API migration</h3>
              <p>
                ZText&rsquo;s default size changed from 16px to 14px. We first
                made existing size choices explicit at call sites and required
                them in TypeScript, then normalized conditional size props,
                changed the default, and finally removed redundant explicit
                sizes. The preparation PR touched 631 files; the final cleanup
                touched 1,135. Those are separate PR sizes, not unique files
                across the project. The staged sequence made each contract
                change reviewable, at the cost of broad mechanical diffs and
                coordination with teams editing the same code.
              </p>
              <h3>Standardize intent, not just appearance</h3>
              <p>
                The pill-select API gained semantic variants and getOptionLabel,
                while keeping custom rendering available for cases that needed
                it. We also removed a redundant &ldquo;clear condition&rdquo;
                pill where the autocomplete already provided clearing. The goal
                was to make the shared component the straightforward choice,
                without forcing every interaction into an identical shape.
              </p>
              <h3>How the work was divided</h3>
              <p>
                I was the lead engineer. Most of the job was splitting the
                migration into work each product team could own, in two shapes.
                Component migrations: replace every use of a legacy component in
                your code with its rebuilt version, which carries the new brand,
                the improved UX and the engineering cleanup at once. Design
                migrations: work with your designer to bring a page, or a
                bespoke component your team owns, onto the new brand. A
                migration tracker assigned owners to the legacy modals we had
                identified. Later audits found both newly split components and
                unassigned call sites; the initial inventory was not complete.
              </p>
              <p>
                Design shipped specs in weekly batches. Another frontend
                engineer and I divided each batch and worked the questions back
                with the designer directly. I remember roughly seventy polish
                PRs, an estimate rather than a complete project PR count. Weekly
                batches gave us a regular place to resolve design questions
                instead of relying only on individual code reviews.
              </p>
              <h3>What I owned</h3>
              <ul className="case-study-list">
                {OWNED_DECISIONS.map((decision) => (
                  <li key={decision}>{decision}</li>
                ))}
              </ul>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-rollout">
              <p className="case-study-kicker">03 · Rollout</p>
              <h2 id="cs-rollout">
                Launch in rings, then delete the old brand
              </h2>
              <p>
                The brand launch, replacement-component rollout and code
                retirement were different milestones. Immediately before GA, we
                kept the replacement date pickers behind their own flag and
                styled the existing pickers for the new brand. The migration
                also had to preserve invalid-input handling, the null value
                contract, internal versus consumer-provided errors, and a stable
                clear-button identity. A visual refresh did not remove those
                behavioral obligations.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  Customer rollout and code retirement · July 2024 to January
                  2025
                </figcaption>
                <ol className="case-study-timeline">
                  {MILESTONES.map(([when, what]) => (
                    <li key={when}>
                      <time>{when}</time> {what}
                    </li>
                  ))}
                </ol>
              </figure>
              <p className="case-study-note">
                Customer dates and cohort sizes are from my project account;
                code events are PR merge dates, not deployment timestamps. The
                numbered cleanup series is only part of the follow-through.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  The welcome modal&rsquo;s art: the same card in Aspen and in
                  Birch, from Zip&rsquo;s launch materials
                </figcaption>
                <img
                  className="case-study-compare"
                  src={announcementArt}
                  width={432}
                  height={290}
                  loading="lazy"
                  decoding="async"
                  alt="Two versions of the same approval card side by side. Left, the old brand: an amber status icon, a grey grid background and the old blocky ZIP wordmark. Right, the new brand: a yellow status icon, a deep blue background and the new lowercase Zip wordmark."
                />
              </figure>
              <p>
                I don&rsquo;t recall new bug reports arriving through the
                wide-rollout feedback form. That does not mean the launch was
                bug-free: issues reached us through customer success, dogfooding
                and QA. My project account records more than thirty closed
                support tickets, including bugs and feature requests. That is
                work completed, not a measured reduction in ticket volume. The
                rebrand gave us room to address requests that otherwise would
                have waited.
              </p>
              <h3>The cleanup</h3>
              <p>
                Cleanup started before the customer toggle disappeared. One
                find-and-replace pass removed roughly four hundred flag
                references; the last <code>isBrand2</code> references were
                removed in the December 9 PR. Type checks and visual review
                helped, but neither guaranteed that every usage was correct. The
                later work removed no-op props, retired ZButton&rsquo;s small
                and large size aliases, and unified color constants. Nine
                numbered cleanup PRs merged from November 18 through January 10,
                with other cleanup and component-adoption PRs outside that
                series.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  Gross lines deleted: {lines(CLEANUP_TOTAL)} across nine
                  numbered cleanup PRs
                </figcaption>
                <div className="rdp-chart" aria-hidden="true">
                  {CLEANUP.map((pr) => (
                    <React.Fragment key={pr.label}>
                      <span className="rdp-chart-label">{pr.label}</span>
                      <div className="rdp-chart-bars">
                        <div
                          className="rdp-bar rdp-bar-after"
                          style={{
                            width: share(pr.removed, CLEANUP_MAX_LINES),
                          }}
                        >
                          <span>{lines(pr.removed)}</span>
                        </div>
                      </div>
                    </React.Fragment>
                  ))}
                  <div className="rdp-chart-axis">
                    <span style={{ left: "0%" }}>0</span>
                    <span style={{ left: "50%" }}>2,500</span>
                    <span style={{ left: "100%", whiteSpace: "nowrap" }}>
                      5,000 lines
                    </span>
                  </div>
                </div>
                {/* Clip a wrapper: a table's intrinsic minimum width can
                    overflow a narrow viewport even when it is sr-only. */}
                <div className="sr-only">
                  <table>
                    <caption>
                      Gross lines deleted: {lines(CLEANUP_TOTAL)} across nine
                      numbered cleanup PRs
                    </caption>
                    <thead>
                      <tr>
                        <th scope="col">Cleanup PR</th>
                        <th scope="col">Lines deleted</th>
                        <th scope="col">Lines added</th>
                      </tr>
                    </thead>
                    <tbody>
                      {CLEANUP.map((pr) => (
                        <tr key={pr.label}>
                          <th scope="row">{pr.label}</th>
                          <td>{lines(pr.removed)}</td>
                          <td>{lines(pr.added)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </figure>
              <p className="case-study-note">
                The same nine PRs added {lines(CLEANUP_ADDED)} lines: a net
                reduction of {lines(CLEANUP_TOTAL - CLEANUP_ADDED)}. These diff
                totals describe a selected cleanup series, not all project work
                or a measured improvement in maintenance time.
              </p>
              <h3>What the safety net missed</h3>
              <p>
                The first dual-brand Chromatic setup failed to boot its preview;
                a retry fixed an environment-variable assumption. Later,
                Chromatic caught a ZLink usage that depended on inline display,
                but our stories did not systematically cover every application
                usage. Beta feedback and targeted QA were still necessary.
                Standardizing on MUI did not eliminate integration bugs either:
                the side panel needed a follow-up backdrop-layering fix.
              </p>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-takeaways">
              <p className="case-study-kicker">04 · Takeaways</p>
              <h2 id="cs-takeaways">
                The rebrand was the excuse. The revamp was the point.
              </h2>
              <ol className="case-study-takeaways">
                {TAKEAWAYS.map(([title, body]) => (
                  <li key={title}>
                    <strong>{title}</strong> {body}
                  </li>
                ))}
              </ol>
            </section>

            <div className="resume-divider" />

            <footer className="case-study-footer">
              <p className="case-study-note">
                Customers are unnamed. Component and cohort counts are
                approximate; PR file and line counts describe specific changes,
                not business impact. The two images are from Zip&rsquo;s launch
                materials. No internal source code, dashboards, or schemas are
                reproduced here.
              </p>
              <p>
                <strong>Related:</strong>{" "}
                <a
                  className="inverse"
                  href={ZIP_BRAND_STORY_URL}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Designing the flow of business
                </a>
                , Zip&rsquo;s own telling of the rebrand, and{" "}
                <Link className="inverse" to={RDP_CASE_STUDY_PATH}>
                  the request-page case study
                </Link>
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
                  href="mailto:andrew@hunt.codes?Subject=Brand%202.0%20case%20study"
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

export default Brand2CaseStudy;
