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
  /** Empty string skips the heading (the era + lines carry the chapter) */
  title: string;
  /** Body copy; each entry renders as its own paragraph */
  lines: string[];
}

export const JOURNEY_INTRO = {
  overline:
    "A long time ago, on the remote ice world of Rochester, NY, far, far away…",
  title: "THE JOURNEY",
  subtitle: "the andrew hunt story begins",
};

export const JOURNEY_CHAPTERS: JourneyChapter[] = [
  {
    era: "the early years",
    title: "",
    lines: [
      "Born in Rochester, grew up outside of Portland, OR.",
      "Nerdy kid, nerdy adult, attempted football briefly in between.",
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
    title: "The internship",
    lines: [
      "A summer at Airbnb, a first taste of San Francisco and of shipping real code.",
      "Came for a summer, stayed for four more years ❤️",
    ],
  },
  {
    era: "2017 – 2020 · San Francisco",
    title: "Airbnb",
    lines: [
      "Four years on Experiences, building pricing tools for hosts and faster pages for guests.",
      "Led the TypeScript migration and never looked back.",
    ],
  },
  {
    era: "2020 – 2021 · San Francisco",
    title: "Untapped",
    lines: [
      "A much smaller ship: launched the Recruiter Analytics platform and brought TypeScript along.",
    ],
  },
  {
    era: "2021 – 2025 · San Francisco",
    title: "Zip",
    lines: [
      "A startup speedrun. Four years, from 4 to 100 engineers.",
      "Product features, then component systems, then the platform underneath everything. Page loads fell by half along the way.",
    ],
  },
  {
    era: "2025",
    title: "The sabbatical",
    lines: [
      "Stepped away for a proper recharge and a move across the country to NYC.",
      "Then a 3D printer got involved, and the recharge got very specific.",
    ],
  },
  {
    era: "2025 – present · NYC",
    title: "Argos",
    lines: [
      "Consulting from NYC: production frontend for Argos, a legal-tech AI product.",
      "An LLM-powered chatbot, document management, data viz, and advice on the architecture underneath.",
    ],
  },
  {
    era: "fall 2026 →",
    title: "The next chapter",
    lines: [
      "After a year attempting to take a break, he searches the galaxy for a job once more…",
      "This entry could be about your team: andrew@hunt.codes.",
    ],
  },
];

export const JOURNEY_OUTRO = {
  title: "THE END",
  subtitle: "(for now)",
};
