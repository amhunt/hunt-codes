import React, { useEffect, useState } from "react";
import cx from "classnames";
import { ArrowLeftCircle, Calendar } from "react-feather";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import useWindowSize from "./useWindowSize";
import ZipVideoMoon from "./ZipVideoMoon";

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
      "Developed, shipped, and iterated on new product features",
      "Led initiatives to standardize and improve shared components",
      {
        item: "Dev infra — CI/Quality/Dev experience:",
        subbullets: [
          "TypeScript correctness + coverage CI checks",
          "Testing: Jest unit testing, Datadog Synthetic tests, and visual regression testing via Storybook/Chromatic",
          "Built FE/BE logging system with Segment",
        ],
      },
      "Architected and managed build & deploy systems across Webpack, Jenkins, Docker, S3, Cloudflare, and Webflow",
      "Built & maintained frontend infrastructure: dev server, Storybook, testing, logging, sourcemaps, TS/React usage, third-party package usage/maintenance",
      "TypeScript: Enabled TypeScript and led migration of frontend code to 99% type safety",
      "Performance: Improved page load times by >50%, primarily via code splitting and routing optimizations",
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

const Resume = () => {
  const [opacity, setOpacity] = useState(false);
  // The moon's video popover (ZipVideoMoon); while it plays, the résumé
  // panel hides so only the stars remain behind the video
  const [videoOpen, setVideoOpen] = useState(false);
  // Drives the Home link's slide: at rest the heading sits ~288px from
  // the viewport top on xl, so the -260px margin keeps it "in view" until
  // the user scrolls a few dozen px, then the link slides away
  const { ref, inView } = useInView({
    rootMargin: "-260px",
    threshold: 0,
  });

  const size = useWindowSize();
  const isLarge = size === "lg";
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <main className="resume-container" style={{ opacity: opacity ? 1 : 0 }}>
      {/* The moon doubles as the Zip brand-video link (overlay + popover) */}
      <ZipVideoMoon open={videoOpen} onOpenChange={setVideoOpen} />
      {/* The link lives outside .resume-panel so the frosted background
          starts above the "About Me" heading, not around the link */}
      <div
        className={cx("resume-inner-container", videoOpen && "video-hidden")}
      >
        <Link
          className={cx(
            "back-to-home-link flex transition-transform items-center gap-4 mb-6 inverse ml-8 xl:sticky xl:top-[200px] xl:-ml-8",
            !inView && isLarge && "-translate-x-32",
          )}
          to="/home"
        >
          <ArrowLeftCircle size={40} />
          Home
        </Link>
        <div className="resume-panel">
          <h1 ref={ref} className="mt-0 mb-6">
            About Me
          </h1>
          <p className="resume-intro">
            Hey! I’m a frontend engineer based in New York. I spent ~4 years at{" "}
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
            back in through consulting, helping teams ship polished, AI-powered
            web products. Come fall 2026 I’m looking to go full-time again — for
            consulting or full-time inquiries, reach out to{" "}
            <a
              className="inverse"
              href="mailto:andrew@hunt.codes?Subject=Hey%20Andrew"
            >
              andrew@hunt.codes
            </a>
            .
          </p>
          <div className="resume-divider" />
          <h2>A few things I care about:</h2>
          <ul className="hor-list">
            <li>
              <div className="card-title">Dev infrastructure</div>I believe it’s
              difficult to overstate the importance of investing in the
              development process. Great DevX is a prerequisite to quality UX
              and efficient product development — this includes strong linters,
              fast and thorough CI checks, and leaning on AI (LLMs and coding
              agents) to automate repetitive work and free engineers for
              higher-leverage problems.
            </li>
            <li>
              <div className="card-title">Component systems</div>Investing in a
              well-structured and robust component system will accelerate design
              and engineering work, reduce bugs, and create a more consistent
              user experience.
            </li>
            <li>
              <div className="card-title">Product collaboration</div>I excel
              when collaborating closely with designers + researchers to build
              delightful, engaging web products.
            </li>
            <li>
              <div className="card-title">Performance</div>
              I’m passionate about delivering a lightning-fast, responsive user
              experience. Performance can be a complex problem, and often needs
              to be approached with both a data-driven and user-centric lens.
            </li>
          </ul>
          <div>
            <div className="card-title">
              Tools and frameworks I know fairly well:
            </div>
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
                <h4 className="flex items-center">
                  {item.title}{" "}
                  <span className="pill location-pill">{item.location}</span>
                </h4>
                <h4 className="flex items-center gap-2">
                  {item.date}
                  <Calendar size={12} />
                </h4>
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
            <h4 className="flex items-center">
              Princeton University
              <span className="pill location-pill">BSE</span>
              <span className="pill location-pill">Computer Science</span>
            </h4>
            <h4>September 2013 — June 2017</h4>
          </div>
          <div className="resume-divider" />
          <h2>Other interests</h2>
          <div className="flex flex-wrap gap-2">
            {interests.map((i) => (
              <span className="pill interest-pill" key={i}>
                {i}
              </span>
            ))}
          </div>
        </div>
      </div>
    </main>
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

const interests = [
  "3D Printing",
  "Singing",
  "Product Easter Eggs",
  "Music Production",
  "Politics 😬",
  "Crosswords",
  "Web3",
];

export default Resume;
