/**
 * The /journey crawl, chapter by chapter — the whole story lives in this
 * one file so editing the journey never touches layout or 3D code.
 *
 * To add or edit a chapter: append/edit an entry in JOURNEY_CHAPTERS.
 * Each chapter renders as an era overline, a title, and one paragraph
 * per line. Anything you haven't decided yet: leave it as "[to fill in]"
 * and it'll ride the crawl until you replace it.
 */

export interface JourneyChapter {
  /** Small overline above the title: a year, range, or era */
  era: string;
  title: string;
  /** Body copy; each entry renders as its own paragraph */
  lines: string[];
}

export const JOURNEY_INTRO = {
  overline: "A while ago, in a timezone three hours behind…",
  title: "THE JOURNEY",
  subtitle: "the andrew hunt story",
};

export const JOURNEY_CHAPTERS: JourneyChapter[] = [
  {
    era: "the early years",
    title: "Grew up in Oregon",
    lines: [
      "Raised in [to fill in: hometown], Oregon — evergreens, drizzle, and a family computer that was asking for it.",
      "[to fill in: first computer / first thing ever built]",
    ],
  },
  {
    era: "[to fill in: years] · New Jersey",
    title: "Princeton University",
    lines: [
      "Studied [to fill in: major] at Princeton.",
      "[to fill in: a story — the class, the club, the thesis, the all-nighter]",
    ],
  },
  {
    era: "Summer 2016 · San Francisco",
    title: "Airbnb — the internship",
    lines: [
      "First taste of San Francisco: shipped landing pages for new features and contributed components to the company frontend framework.",
      "Liked it enough to come back.",
    ],
  },
  {
    era: "2017 – 2020 · San Francisco",
    title: "Airbnb — Software Engineer",
    lines: [
      "Built dozens of pricing and availability features across the Experiences host and guest products.",
      "Ran 20+ A/B tests that compounded into >10% more bookings, cut load times by >30% on 10+ pages, and led the TypeScript migration.",
    ],
  },
  {
    era: "2020 – 2021 · San Francisco",
    title: "Untapped — Software Engineer",
    lines: [
      "Launched the Recruiter Analytics platform at Untapped (fka Jumpstart).",
      "Introduced TypeScript, led the frontend platform group, and made the core app 40% faster.",
    ],
  },
  {
    era: "2021 – 2025 · San Francisco",
    title: "Zip — Staff Software Engineer",
    lines: [
      "Four years, zero to staff: new product features, shared component systems, and the frontend infrastructure underneath all of it.",
      "CI type-safety gates, testing across Jest, Datadog Synthetics, and Chromatic, logging with Segment, and build & deploy spanning Webpack, Jenkins, Docker, S3, Cloudflare, and Webflow.",
      "TypeScript to 99% coverage; page loads cut by more than half.",
    ],
  },
  {
    era: "2025",
    title: "The sabbatical",
    lines: [
      "Stepped away for a proper recharge — and a move across the country to New York City.",
      "[to fill in: the best thing you did with the time off]",
    ],
  },
  {
    era: "2025 – present · NYC",
    title: "Independent Consultant — Argos",
    lines: [
      "Consulting from New York: designing, building, and shipping production frontend for Argos, a legal-tech AI product.",
      "An LLM-powered agentic chatbot, legal document management, data visualization — plus advising on architecture, performance, and DevX.",
    ],
  },
  {
    era: "fall 2026 →",
    title: "The next chapter",
    lines: [
      "Looking to go full-time again.",
      "This entry could be about your team — andrew@hunt.codes.",
    ],
  },
];

export const JOURNEY_OUTRO = {
  title: "THE END",
  subtitle: "(for now)",
};
