import React, { useEffect, useState } from "react";
import cx from "classnames";
import { ArrowLeftCircle, Calendar } from "react-feather";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import useWindowSize from "useWindowSize";

const experienceItems = [
  {
    title: "Software Engineer, ZipHQ",
    location: "San Francisco",
    date: "2021 - Present",
    description: [
      "Build new features and pages across the product",
      "Lead efforts to standardize and improve shared components",
      {
        item: "Dev infra – CI/Quality/Dev experience:",
        subbullets: [
          "TypeScript correctness + coverage CI checks",
          "Testing: Jest unit testing, Datadog Synthetic tests, and visual regression testing via Storybook/Chromatic",
          "Built FE/BE logging system with Segment",
        ],
      },
      "Manage build & deploy systems: Architected much of frontend build+deploy systems across Webpack, Jenkins, Docker, S3, Cloudflare, and Webflow",
      "Build & maintain frontend infra: dev server, HMR, logging, sourcemaps, TS/React usage, third-party package usage/maintenance",
      "TypeScript: enabled TypeScript in repo and led migration of frontend code to 99% coverage",
      "Performance: reduced page load times by 50%, primarily via code splitting (70% reduction in core bundle size) and routing optimizations",
    ],
  },
  {
    title: "Software Engineer, Untapped (fka Jumpstart)",
    location: "San Francisco",
    date: "2020 - 2021",
    description: [
      "Built out Recruiter Analytics platform",
      "Introduced TypeScript to the codebase and evangelized",
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
      "Ran >20 A/B tests, resulting in a compound bookings increase of >10% for the Experiences product",
      "Planned and executed on performance initiatives, reducing load times by >30% on 10+ pages",
      "Oversaw conversion of legacy code to TypeScript, evangelized best practices across org",
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
  const { ref, inView } = useInView({
    /* Optional options */
    rootMargin: "-320px",
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
    <div className="resume-container" style={{ opacity: opacity ? 1 : 0 }}>
      <div className="resume-inner-container">
        <Link
          className={cx(
            "flex transition-transform items-center gap-4 mb-12 inverse xl:sticky xl:top-[200px] xl:-ml-16",
            !inView && isLarge && "-translate-x-32"
          )}
          to="/home"
        >
          <ArrowLeftCircle size={40} />
          Back to home
        </Link>
        <h1 ref={ref} className="mb-6">
          About me
        </h1>
        <h4>
          Hey! I’m a frontend engineer based in San Francisco. I’m currently
          working as a staff engineer at{" "}
          <a
            target="_blank"
            rel="noreferrer"
            className="link inverse"
            href="https://ziphq.com"
          >
            Zip
          </a>
          . For consulting inquiries, reach out to{" "}
          <a
            className="link inverse"
            href="mailto:andrew@hunt.codes?Subject=Hey%20Andrew"
          >
            andrew@hunt.codes
          </a>
          .
        </h4>
        <div className="resume-divider" />
        <h3>Work I’m passionate about:</h3>
        <ul className="hor-list">
          <li>
            <div className="card-title">Dev infra</div>Investing in the
            development process is often undervalued. Great DevX is a
            prerequisite to quality UX and efficient product development.
          </li>
          <li>
            <div className="card-title">Component systems</div>A well-structured
            and robust component system should accelerate design and engineering
            work, reduce bugs, and create a consistent user experience.
          </li>
          <li>
            <div className="card-title">Product collaboration</div>I thrive when
            working closely with designers + researchers to build delightful,
            engaging web products.
          </li>
          <li>
            <div className="card-title">Performance</div>
            I’m committed to ensuring a speedy and responsive experience for
            users. Performance can be a complex problem, and often needs to be
            approached with both a data-driven and user-centric lens.
          </li>
        </ul>
        <div>
          <div className="card-title">
            Tools and frameworks I know fairly well:
          </div>
          TypeScript / JavaScript, Material UI, React, Apollo + GraphQL,
          Storybook, ESLint, GitHub Actions, D3, Tailwind, Chromatic,
          Cloudflare, Jest, Webpack, Vite, Vue
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
                      <ul>{d.subbullets?.map((s) => <li key={s}>{s}</li>)}</ul>
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
  );
};

const interests = [
  "Singing",
  "Easter Eggs",
  "Crosswords",
  "Music Production",
  "Politics",
  "Running",
  "Web3",
];

export default React.memo(Resume);
