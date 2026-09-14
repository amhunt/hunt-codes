import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeftCircle } from "react-feather";
import { ArrowRight } from "lucide-react";

import { RDP_CASE_STUDY_PATH } from "./routes";
import announcementArt from "./assets/brand2/announcement-before-after.svg";
import requestPageOldNew from "./assets/brand2/request-page-old-new.webp";

/**
 * /projects-and-toys/brand-2-case-study: the Brand 2.0 case study — the 2024
 * rebrand of Zip's web app that Andrew led as engineering lead, shipped
 * with both brands live in one codebase behind a flag, rolled out in
 * rings over five months, and then deleted down to zero flag references.
 * A reading page in /about's shell, like the request-page case study
 * (RdpCaseStudy): AppBackground gives every case study the about view,
 * and the furniture — stat tiles, cards, the timeline, the bar chart,
 * the numbered takeaways — is the shared `.case-study-*` set in App.scss, plus the
 * request-page study's `.rdp-chart` bars.
 *
 * The counts are the ones Andrew keeps; the cleanup chart is drawn from
 * the PRs' own line counts. No customer is named, and nothing here is
 * internal source, a dashboard or a schema.
 */

/** Mirrors /about: overlap the tail of the arrival swoop rather than
 *  waiting it out */
const REVEAL_DELAY_MS = 1000;

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
    "One flag, and sub-flags for the risky parts.",
    "isBrand2 gated everything. Date pickers, dropdown inputs and the launch announcement got flags of their own, so each could ship, or hold, on its own schedule.",
  ],
  [
    "A toggle for customers, with feedback attached.",
    "During the beta a customer could switch brands themselves, and a feedback form rode along with the toggle.",
  ],
  [
    "Query params for testing.",
    "A b1 or b2 param forced either brand in any environment, so a reviewer could look at a change both ways from one link.",
  ],
  [
    "Snapshots of both worlds.",
    "A second Chromatic job rendered every Storybook story with the new brand, so a change to a core component was diffed in both brands at once until the old one was retired.",
  ],
  [
    "MUI underneath.",
    "The overlays were rebuilt on MUI: side panels on Drawer, modals on Dialog, pill selects on Select, skeletons on the text variant. One base for transitions, focus and layering.",
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
    "Design partners go first. The second Chromatic job starts snapshotting every story in both brands.",
  ],
  ["Late Aug to Sep", "Beta: about 30 companies, in two tranches."],
  ["Sep 24", "The opt-in toggle and a welcome modal open it up to everyone."],
  ["Oct 25", "General availability. Every customer is on Brand 2.0."],
  ["Oct 28", "Zip publishes the brand story."],
  ["Early Nov", "Discover, the last surface, follows."],
  ["Nov 21", "The brand toggle is removed. Cleanup begins."],
  ["Dec 9", "The last isBrand2 reference is deleted."],
  ["Jan 10, 2025", "Cleanup part nine. Done."],
] as const;

/** The nine cleanup PRs, by lines deleted (from the PRs themselves) */
const CLEANUP = [
  { label: "1 · Alerts and toasts", removed: 611 },
  { label: "2 · Find-and-replace pass", removed: 1118 },
  { label: "3 · Brand-name references", removed: 3115 },
  { label: "4 · Announcement and toggle", removed: 4575 },
  { label: "5 · Lib folder styles", removed: 2463 },
  { label: "6 · Last isBrand2 references", removed: 1566 },
  { label: "7 · ZButton sizes", removed: 1326 },
  { label: "8 · No-op props", removed: 451 },
  { label: "9 · Color constants", removed: 727 },
];
const CLEANUP_MAX_LINES = 5000;
const CLEANUP_TOTAL = CLEANUP.reduce((sum, pr) => sum + pr.removed, 0);

/** The calls that were Andrew's */
const OWNED_DECISIONS = [
  "Running both brands live in one codebase behind a flag, rather than cutting over on a branch.",
  "The second Chromatic job, so every core-component change was diffed in both brands.",
  "MUI as the base for every overlay.",
  "Sub-flags for the risky components, and the customer toggle with feedback attached.",
  "Per-environment favicons, so nobody mistook a dev tab for prod.",
  "The find-and-replace cleanup strategy, with TypeScript and Chromatic as the net.",
  "Most of the changes to the core component library itself.",
];

const TAKEAWAYS = [
  [
    "A rebrand is the cheapest moment to change behavior.",
    "Customers are already braced for the app to look different. UX changes that were never worth the confusion on their own can ship with it, and they did.",
  ],
  [
    "Run both brands live and ring the rollout by tolerance.",
    "The eager customers polish the release for the cautious ones. By general availability the new brand had been in real use for two months.",
  ],
  [
    "Snapshot both worlds.",
    "One Chromatic job per brand turned “does this break the old brand?” from a question into a diff.",
  ],
  [
    "Flags are debt with a deadline.",
    "The deletion was planned when the flag was added. Once the toggle went, 1,800 references were gone in under three weeks and the old brand in seven.",
  ],
  [
    "Use the moment to dedupe.",
    "A dozen duplicate components disappeared because everything was being touched anyway.",
  ],
] as const;

const share = (n: number, max: number) => `${(n / max) * 100}%`;
const lines = (n: number) => n.toLocaleString("en-US");

const Brand2CaseStudy = () => {
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
                Rebranding a live enterprise app, one flag at a time
              </h1>
              <p className="case-study-lede">
                Zip&rsquo;s Brand 2.0 started as a marketing rebrand.
                Engineering used it to rebuild the component library, ship a
                backlog of long-wanted UX changes, and roll all of it out to
                every customer over five months without a cutover: both brands
                live in one codebase, behind one flag, until the old one could
                be deleted.
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
                  <dt>Flag references, then none</dt>
                  <dd>
                    <span className="case-study-before">1,800</span>
                    <span className="sr-only"> to </span>
                    <ArrowRight aria-hidden="true" size={22} />
                    <span className="case-study-after">0</span>
                  </dd>
                </div>
              </dl>
              <p className="case-study-facts">
                <span className="pill tool-pill">Design systems</span>
                <span className="pill tool-pill">Migrations</span>
                <span className="pill tool-pill">Technical leadership</span>
                <span>Zip · Aug 2024 to Jan 2025</span>
                <span>Role: lead engineer</span>
                <span>
                  Team: designers and frontend engineers across every product
                  team
                </span>
              </p>
            </header>

            <div className="resume-divider" />

            <section aria-labelledby="cs-context">
              <p className="case-study-kicker">01 · Context</p>
              <h2 id="cs-context">A rebrand that became a revamp</h2>
              <p>
                Brand 2.0 began as a brand and marketing effort: a new logo, a
                new palette, new type. On the product side it was the opening
                the frontend team had been waiting for. A rebrand is the one
                moment customers are already braced for the app to look and feel
                different, so the UX changes that were never worth the confusion
                of shipping on their own, and the component-library rebuild the
                engineers had wanted for years, could ride along with it.
              </p>
              <p>
                The result was effectively a revamp of the whole web app: a new
                design system, Birch, replacing Aspen; around twenty core
                components rebuilt from scratch and more than a hundred
                restyled; a dozen duplicate library components retired; and a
                long list of customer-requested improvements folded in.
                Customers noticed. The ones who heard about it early asked to be
                switched over ahead of their turn.
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
                from motion, and a palette revised to meet accessibility
                standards. It also says the designers folded the new language
                straight into the product, paying down design debt and refining
                the core components as they went. This page is the engineering
                side of that sentence: how a rebrand of that size reached a live
                app, in every customer&rsquo;s hands, without a cutover.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  The request page in Aspen and in Birch, from Zip&rsquo;s
                  launch materials
                </figcaption>
                <img
                  className="case-study-compare"
                  src={requestPageOldNew}
                  alt="Two screenshots of Zip's request page side by side, labelled Old and New. Old: a compact header with status pills, tabs, and an approval workflow drawn as small cards on a grey grid. New: the same page in the new brand, with larger type, more space, integration task pills across the top, and the workflow as bigger cards with status dropdowns and an Approve button, on a deep blue backdrop."
                />
              </figure>
            </section>

            <div className="resume-divider" />

            <section aria-labelledby="cs-approach">
              <p className="case-study-kicker">02 · Approach</p>
              <h2 id="cs-approach">Two brands, one codebase, one flag</h2>
              <p>
                Zip&rsquo;s largest enterprise customers wanted a three-month
                launch process, alpha to beta to launch, and had the lowest
                tolerance for issues. A cutover on a branch could not give them
                that. So both brands ran live in one codebase behind an{" "}
                <code>isBrand2</code> flag. That made a ringed rollout possible:
                the eager, higher-tolerance customers got the improvements
                first, and what they found polished the release before the
                cautious ones ever saw it. By the time it reached everyone, it
                was tried.
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
              <h3>How the work was divided</h3>
              <p>
                I was the lead engineer. Most of the job was splitting the
                migration into work each product team could own, in two shapes.
                Component migrations: replace every use of a legacy component in
                your code with its rebuilt version, which carries the new brand,
                the improved UX and the engineering cleanup at once. Design
                migrations: work with your designer to bring a page, or a
                bespoke component your team owns, onto the new brand. A
                migration tracker assigned every legacy modal to an owner.
              </p>
              <p>
                Design shipped specs in weekly batches. Another frontend
                engineer and I divided each batch and worked the questions back
                with the designer directly, which is what kept seventy-odd
                polish PRs from turning into design by code review.
              </p>
              <h3>The calls that were mine</h3>
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
              <figure className="case-study-figure">
                <figcaption>Five months, ring by ring</figcaption>
                <ol className="case-study-timeline">
                  {MILESTONES.map(([when, what]) => (
                    <li key={when}>
                      <time>{when}</time>
                      {what}
                    </li>
                  ))}
                </ol>
              </figure>
              <figure className="case-study-figure">
                <figcaption>
                  The welcome modal&rsquo;s art: the same card in Aspen and in
                  Birch
                </figcaption>
                <img
                  className="case-study-compare"
                  src={announcementArt}
                  alt="Two versions of the same approval card side by side. Left, the old brand: an amber status icon, a grey grid background and the old blocky ZIP wordmark. Right, the new brand: a yellow status icon, a deep blue background and the new lowercase Zip wordmark."
                />
              </figure>
              <p>
                The feedback form, switched on only for the wide rollout, caught
                no bugs. The design partners and the beta had already surfaced
                them, through customer success rather than a form. Across the
                launch we closed more than thirty support tickets, a mix of bugs
                and feature requests. Because the whole app was changing anyway,
                existing behavior could change with it, so requests that would
                normally have waited got folded in.
              </p>
              <h3>The cleanup</h3>
              <p>
                A flag is debt with a deadline. Once the toggle was gone, nine
                cleanup PRs over seven weeks removed the old brand entirely:
                1,800 <code>isBrand2</code> references, first with a
                find-and-replace pass that cleared four hundred in one PR, then
                by hand, with TypeScript and Chromatic as the safety net. The
                last reference went on December 9. The tail retired no-op props,
                collapsed ZButton&rsquo;s sizes into one, and unified the color
                constants, so the component API came out smaller than it went
                in.
              </p>
              <figure className="case-study-figure">
                <figcaption>
                  The cleanup, in deleted lines: {lines(CLEANUP_TOTAL)} across
                  nine PRs
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
                </div>
                <table className="sr-only">
                  <caption>
                    The cleanup, in deleted lines: {lines(CLEANUP_TOTAL)} across
                    nine PRs
                  </caption>
                  <thead>
                    <tr>
                      <th scope="col">Cleanup PR</th>
                      <th scope="col">Lines deleted</th>
                    </tr>
                  </thead>
                  <tbody>
                    {CLEANUP.map((pr) => (
                      <tr key={pr.label}>
                        <th scope="row">{pr.label}</th>
                        <td>{lines(pr.removed)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </figure>
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
                    <strong>{title}</strong>
                    {body}
                  </li>
                ))}
              </ol>
            </section>

            <div className="resume-divider" />

            <footer className="case-study-footer">
              <p className="case-study-note">
                Customers are unnamed, the counts are round, and the two images
                are from Zip&rsquo;s own launch materials. No internal code,
                dashboards, or schemas are reproduced here.
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
