import React, { useCallback, useEffect, useRef, useState } from "react";
import cx from "classnames";
import { ArrowLeftCircle, Calendar } from "react-feather";
import { ArrowLeftCircleIcon } from "lucide-react";
import { Link } from "react-router-dom";
import useWindowSize from "./useWindowSize";
import ZipVideoMoon from "./ZipVideoMoon";
import egg1 from "./assets/eggs/egg-1.png";
import egg2 from "./assets/eggs/egg-2.png";
import egg3 from "./assets/eggs/egg-3.png";
import egg4 from "./assets/eggs/egg-4.png";
import egg5 from "./assets/eggs/egg-5.png";
import egg6 from "./assets/eggs/egg-6.png";

const experienceItems = [
  {
    title: "Independent Software Consultant, Argos",
    location: "San Francisco + Remote",
    date: "2025 - Present",
    description: [
      "Design, build, and ship production frontend features end to end for Argos, a legal tech AI product",
      "Build product experiences — including an LLM-powered agentic chatbot, legal document management, and data visualization tools",
      "Advise on and implement best practices in frontend architecture, web performance, and developer tooling / DevX",
    ],
  },
  {
    title: "Staff Software Engineer, Zip",
    location: "San Francisco",
    date: "2021 - 2025",
    description: [
      "Shipped product features end to end across Zip's procurement platform",
      "Led shared-component standardization — tighter UX consistency, less design/eng thrash",
      {
        item: "Dev infra — CI, quality, and DevX:",
        subbullets: [
          "TypeScript correctness + coverage gates in CI",
          "Jest unit tests, Datadog synthetics, and visual regression via Storybook/Chromatic",
          "Built unified FE/BE logging pipeline with Segment",
        ],
      },
      "Owned build & deploy across Webpack, Jenkins, Docker, S3, Cloudflare, and Webflow",
      "Enabled TypeScript and led the frontend migration to 99% type safety",
      "Cut page load times by >50% via code splitting and routing optimizations",
    ],
  },
  {
    title: "Software Engineer, Untapped (fka Jumpstart)",
    location: "San Francisco",
    date: "2020 - 2021",
    description: [
      "Developed and launched Recruiter Analytics platform",
      "Introduced and evangelized TypeScript",
      "Led frontend platform group, overseeing all quality and performance initiatives",
      "Improved core app performance by 40%",
    ],
  },
  {
    title: "Software Engineer, Airbnb",
    location: "San Francisco",
    date: "2017 - 2020",
    description: [
      "Built dozens of pricing and availability features across Experiences host and guest products",
      "Executed 20+ A/B tests, resulting in a compound bookings increase of >10% for the Experiences product",
      "Led and executed performance initiatives, reducing load times by >30% on 10+ pages",
      "Led migration to TypeScript, evangelized best practices across org",
    ],
  },
  {
    title: "Software Engineering Intern, Airbnb",
    location: "San Francisco",
    date: "Summer 2016",
    description: [
      "Built landing pages for new features",
      "Contributed components to company frontend framework",
    ],
  },
];

// The Home link's scroll-scrubbed slide: it travels SLIDE_DISTANCE_PX
// leftward over the first SLIDE_RANGE_PX of the container's scroll
const SLIDE_RANGE_PX = 100;
const SLIDE_DISTANCE_PX = 128; // the old Tailwind -translate-x-32

const Resume = () => {
  const [opacity, setOpacity] = useState(false);
  // The moon's video popover (ZipVideoMoon); while it plays, the resume
  // panel hides so only the stars remain behind the video
  const [videoOpen, setVideoOpen] = useState(false);
  const size = useWindowSize();
  const isSmall = size === "sm";

  // Clicking the "Product Easter Eggs" pill fires the full celebration
  // (lazy-loaded to keep it all off /about's critical path): the
  // ribbons.js.org "Confetti + Ribbons" combo — confetti raining from the
  // top edge while ribbon waves flow across — with ~EGG_RAIN_COUNT easter
  // eggs falling scattered through the rain. Each library reuses one shared
  // container across calls; unmount clears the timers and destroys the
  // containers so nothing outlives the page.
  const confettiContainer = useRef<{ destroy: () => void }>(undefined);
  const ribbonsContainer = useRef<{ destroy: () => void }>(undefined);
  const celebrationTimers = useRef<number[]>([]);
  const releaseEggs = useCallback(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    void Promise.all([
      import("@tsparticles/confetti"),
      import("@tsparticles/ribbons"),
    ]).then(async ([{ confetti }, { ribbons }]) => {
      // Both plugin sets must register before the first load() — the shared
      // tsParticles engine refuses new plugins once anything has loaded
      await Promise.all([confetti.init(), ribbons.init()]);
      const animationEnd = Date.now() + CELEBRATION_MS;

      // Pre-pick which rain ticks also drop an easter egg, so exactly
      // EGG_RAIN_COUNT eggs fall scattered across the whole window
      const totalTicks = Math.floor(CELEBRATION_MS / RAIN_TICK_MS);
      const eggTicks = new Set<number>();
      while (eggTicks.size < EGG_RAIN_COUNT) {
        eggTicks.add(Math.floor(Math.random() * totalTicks));
      }

      let tick = 0;
      const rain = window.setInterval(() => {
        if (Date.now() >= animationEnd) {
          return window.clearInterval(rain);
        }
        // On egg ticks the drop IS the egg — two concurrent confetti()
        // calls in one tick race inside the shared container and the
        // second one's particles never spawn
        if (eggTicks.has(tick++)) {
          // Eggs vary in size, and bigger eggs fall faster (gravity
          // scales with the egg's scalar). Flat because the tumble
          // updaters render non-flat images edge-on half the time, where
          // a lone falling egg reads as a sliver
          const size =
            EGG_MIN_SCALE + Math.random() * (EGG_MAX_SCALE - EGG_MIN_SCALE);
          void confetti({
            angle: 90,
            spread: 70,
            origin: { x: Math.random(), y: 0 },
            ticks: 0,
            particleCount: 1,
            scalar: size,
            gravity: EGG_GRAVITY_PER_SCALE * size,
            flat: true,
            shapes: ["image"],
            shapeOptions: {
              image: eggImages.map((src) => ({ src, width: 32, height: 40 })),
            },
          });
        } else {
          void confetti({
            angle: 90,
            spread: 70,
            origin: { x: Math.random(), y: 0 },
            gravity: 1.2,
            ticks: 0,
            particleCount: 8,
            colors: celebrationColors,
          }).then((container) => {
            confettiContainer.current = container;
          });
        }
      }, RAIN_TICK_MS);
      celebrationTimers.current.push(rain);

      const releaseRibbons = () =>
        void ribbons({ colors: celebrationColors }).then((container) => {
          ribbonsContainer.current = container;
        });
      const start = window.setTimeout(() => {
        releaseRibbons();
        const wave = window.setInterval(() => {
          if (Date.now() >= animationEnd) {
            return window.clearInterval(wave);
          }
          releaseRibbons();
        }, 2000);
        celebrationTimers.current.push(wave);
      }, 2000);
      celebrationTimers.current.push(start);
    });
  }, []);
  useEffect(
    () => () => {
      celebrationTimers.current.forEach((id) => window.clearInterval(id));
      confettiContainer.current?.destroy();
      ribbonsContainer.current?.destroy();
    },
    [],
  );

  // The Home link's leftward slide is scrubbed by scroll, not animated:
  // it tracks the first SLIDE_RANGE_PX of scrollTop directly, so stopping
  // mid-range parks the link mid-slide. Written straight to the element's
  // style (no React state) — scroll fires every frame.
  const linkRef = useRef<HTMLAnchorElement>(null);
  const handleScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    const progress = Math.min(1, e.currentTarget.scrollTop / SLIDE_RANGE_PX);
    if (linkRef.current) {
      linkRef.current.style.translate = `${-SLIDE_DISTANCE_PX * progress}px 0`;
    }
  }, []);
  useEffect(() => {
    // Overlap the tail of the 2s arrival swoop (the translucent panel
    // tolerates it) and cut half a second of dead time on direct loads
    const timer = setTimeout(() => {
      setOpacity(true);
    }, 1000);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      {/* On phones the Home link takes the same corner slot and sizing as
          /home's "Back to orbit" link, outside the scroller so it stays
          put (body.video-mode hides .homePageBackLink) */}
      {isSmall && (
        <div
          className="homePageBackLink"
          style={{ opacity: opacity ? 1 : 0, transition: "opacity 1s ease" }}
        >
          <Link className="mt-4 flex items-center gap-1" to="/home">
            <ArrowLeftCircleIcon className="starIcon" size={16} />
            <span>Home</span>
          </Link>
        </div>
      )}
      <main
        className="resume-container"
        style={{ opacity: opacity ? 1 : 0 }}
        onScroll={handleScroll}
      >
        {/* The moon doubles as the Zip brand-video link (overlay + popover).
            Not on phones: the panel is full-bleed there and the moon sits
            behind it (CameraRig's aboutMoonNdcX returns null), so the
            invisible overlay would just be a 165px tap trap over the intro
            paragraph and whatever scrolls under it. SolarScene drops the
            moon's link halo to match. */}
        {!isSmall && (
          <ZipVideoMoon open={videoOpen} onOpenChange={setVideoOpen} />
        )}
        {/* The link lives outside .resume-panel so the frosted background
          starts above the "About Me" heading, not around the link.
          w-fit: as a flex row it would otherwise stretch to the panel's
          full width, and once it goes sticky that invisible strip rides
          over the resume and steals clicks from the text under it. */}
        <div
          className={cx("resume-inner-container", videoOpen && "video-hidden")}
        >
          {/* md and up: pinned at its rest height (sticky top matches each
              breakpoint's .resume-inner-container top margin, so it never
              moves vertically) while handleScroll scrubs it leftward over
              the first stretch of scroll */}
          {!isSmall && (
            <Link
              ref={linkRef}
              className="back-to-home-link flex w-fit items-center gap-4 mb-6 inverse -ml-8 md:sticky md:top-20 xl:top-50"
              to="/home"
            >
              <ArrowLeftCircle size={40} />
              Home
            </Link>
          )}
          <div className="resume-panel">
            <h1 className="mt-0 mb-6">About Me</h1>
            <p className="resume-intro">
              Hey! I’m a frontend engineer based in New York. I spent ~4 years
              at{" "}
              <a
                target="_blank"
                rel="noreferrer"
                className="inverse"
                href="https://ziphq.com"
              >
                Zip
              </a>{" "}
              — most recently as a staff engineer — before stepping away in 2025
              for a proper sabbatical. A few months of recharging later, I eased
              back in through consulting, helping teams ship polished,
              AI-powered web products. Come fall 2026 I’m looking to go
              full-time again — reach out to{" "}
              <a
                className="inverse"
                href="mailto:andrew@hunt.codes?Subject=Hey%20Andrew"
              >
                andrew@hunt.codes
              </a>
              .
            </p>
            {/* Hidden until /journey gets more polish:
            <p className="journey-plug">
              Prefer the cinematic cut?{" "}
              <Link className="inverse" to="/journey">
                Watch the journey
              </Link>{" "}
              🚀
            </p> */}
            <div className="resume-divider" />
            <h2>How I like to work</h2>
            <ul className="hor-list">
              <li>
                <div className="card-title">Dev infrastructure</div>I believe
                it’s difficult to overstate the importance of investing in the
                development process. Great DevX is a prerequisite to quality UX
                and efficient product development — this includes strong
                linters, fast and thorough CI checks, and leaning on AI (LLMs
                and coding agents) to automate repetitive work and free
                engineers for higher-leverage problems.
              </li>
              <li>
                <div className="card-title">Component systems</div>Investing in
                a well-structured and robust component system will accelerate
                design and engineering work, reduce bugs, and create a more
                consistent user experience.
              </li>
              <li>
                <div className="card-title">Product collaboration</div>
                The best products come from designers, researchers, and
                engineers building in the same room — tight feedback loops,
                shared taste, and a bias toward shipping the delightful details.
              </li>
              <li>
                <div className="card-title">Performance</div>
                I’m passionate about delivering a lightning-fast, responsive
                user experience. Performance can be a complex problem, and often
                needs to be approached with both a data-driven and user-centric
                lens.
              </li>
            </ul>
            <div>
              <div className="card-title">Tools & Frameworks in my orbit</div>
              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((t) => (
                  <span className="pill tool-pill" key={t}>
                    {t}
                  </span>
                ))}
              </div>
            </div>

            <div className="resume-divider" />

            <h2>Experience</h2>
            {experienceItems.map((item) => (
              <React.Fragment key={item.title}>
                <div className="splitRow">
                  <h3 className="flex items-center">
                    {item.title}{" "}
                    <span className="pill location-pill">{item.location}</span>
                  </h3>
                  <span className="resume-date flex items-center gap-2">
                    {item.date}
                    <Calendar size={12} />
                  </span>
                </div>
                <ul>
                  {item.description.map((d, idx) => (
                    <li key={idx}>
                      {typeof d === "string" ? (
                        d
                      ) : (
                        <>
                          {d.item}
                          <ul>
                            {d.subbullets?.map((s) => (
                              <li key={s}>{s}</li>
                            ))}
                          </ul>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </React.Fragment>
            ))}
            <div className="resume-divider" />
            <h2>Education</h2>
            <div className="splitRow">
              <h3 className="flex items-center">
                Princeton University
                <span className="pill location-pill">BSE</span>
                <span className="pill location-pill">Computer Science</span>
              </h3>
              <span className="resume-date">September 2013 — June 2017</span>
            </div>
            <div className="resume-divider" />
            <h2>Other interests</h2>
            <div className="flex flex-wrap gap-2">
              {interests.map((i) =>
                i === "Product Easter Eggs" ? (
                  <button
                    type="button"
                    className="pill interest-pill easter-egg-pill"
                    key={i}
                    onClick={releaseEggs}
                  >
                    {i}
                  </button>
                ) : (
                  <span className="pill interest-pill" key={i}>
                    {i}
                  </span>
                ),
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
};

const tools = [
  "TypeScript",
  "React",
  "GraphQL / Apollo",
  "Vite",
  "Tailwind",
  "LLMs / AI SDKs",
  "ESLint",
  "GitHub Actions",
  "Storybook",
  "Chromatic",
  "Vitest + Jest",
  "D3",
  "Three.js",
  "Cloudflare / CDN Management",
  "Vue",
];

const eggImages = [egg1, egg2, egg3, egg4, egg5, egg6];

// Rain + ribbons in the site's own accents: $purp and $purp-light from
// App.scss, the interest-pill rainbow-cycle blue, and the hover-gradient
// green
const celebrationColors = ["#412596", "#9e80f9", "#487de7", "#2f9e44"];

// Matches the ribbons.js.org "Confetti + Ribbons" demo timing: rain the
// whole window, first ribbon wave at 2s, a new wave every 2s after
const CELEBRATION_MS = 6000;
// The demo rains every 50ms; 70ms thins the confetti ~30%
const RAIN_TICK_MS = 70;

// Easter eggs mixed into the rain across the full celebration
const EGG_RAIN_COUNT = 14;
// Egg size range (confetti scalar). Bigger eggs fall faster: each egg's
// gravity is scalar × EGG_GRAVITY_PER_SCALE (the rain pieces use 1.2)
const EGG_MIN_SCALE = 2.5;
const EGG_MAX_SCALE = 5;
const EGG_GRAVITY_PER_SCALE = 0.6;

const interests = [
  "3D Printing",
  "Singing",
  "Product Easter Eggs",
  "Music Production",
  "Politics 😬",
  "Crosswords",
];

export default Resume;
