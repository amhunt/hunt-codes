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
  overline:
    "A long time ago, on the remote ice world of Rochester, New York, far, far away…",
  title: "THE JOURNEY",
  subtitle: "the andrew hunt story begins",
};

export const JOURNEY_CHAPTERS: JourneyChapter[] = [
  {
    era: "the early years",
    title: "Grew up in Oregon",
    lines: [
      "Born in Rochester, grew up outside of Portland, OR.",
      "Nerdy kid, nerdy adult — attempted football briefly in between.",
      "The evidence: Lego robotics, a high-school robotics captaincy, and a middle-school website called “Andy and David: A place for fun.” It was.",
    ],
  },
  {
    era: "2013 – 2017 · New Jersey",
    title: "Princeton University",
    lines: [
      "Studied computer science at Princeton.",
      "Learned how to… color graphs?",
    ],
  },
  {
    era: "Summer 2016 · San Francisco",
    title: "Airbnb — the internship",
    lines: [
      "First taste of San Francisco: shipped landing pages for new features and contributed components to the company frontend framework.",
      "Came for a summer; stayed for four more years ❤️",
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
      "A startup speedrun — four years, zero to staff: product features, component systems, and the infrastructure underneath.",
      "Type-safety gates in CI, testing three layers deep, and the build-and-deploy machinery under everything.",
      "TypeScript to 99% coverage; page loads cut by more than half.",
    ],
  },
  {
    era: "2025",
    title: "The sabbatical",
    lines: [
      "Stepped away for a proper recharge — and a move across the country to New York City.",
      "Then a 3D printer got involved, and the recharge got very specific.",
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
      "After a year attempting to take a break, he searches the galaxy for a job once more…",
      "This entry could be about your team — andrew@hunt.codes.",
    ],
  },
];

export const JOURNEY_OUTRO = {
  title: "THE END",
  subtitle: "(for now)",
};
