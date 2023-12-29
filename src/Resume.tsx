import React, { useEffect, useState } from "react";
import { ArrowLeftCircle, Calendar } from "react-feather";
import { Link } from "react-router-dom";

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
      "Manage build & deploy systems: Architected much of frontend build+deploy systems, across Webpack, Jenkins, Docker, S3, Cloudflare, and Webflow",
      "Build & maintain frontend infra: dev server, HMR, logging, sourcemaps, TS/React usage, third-party package usage/maintenance",
      "TypeScript: enabled TypeScript in repo and led migration of frontend code to 98% coverage",
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
      "Ran >20 A/B tests, resulting in a compounded bookings lift of >10% for the Experiences product",
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

  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="resume-container" style={{ opacity: opacity ? 1 : 0 }}>
      <div className="resume-inner-container">
        <Link className="mb-12 block inverse" to="/">
          <ArrowLeftCircle size={40} />
        </Link>
        <h1 className="mb-6">About me</h1>
        <h4>
          Hey! I’m a web engineer in San Francisco. For consulting inquiries,
          reach out to{" "}
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
            <div className="card-title">Dev infra</div>I believe a solid
            foundation and developer experience is the best way to increase
            velocity, reduce bugs, and improve the user’s experience.
          </li>
          <li>
            <div className="card-title">Component systems</div>A well-structured
            and robust component system should accelerate design and engineering
            work, reduce bugs, and create a consistent user experience.
          </li>
          <li>
            <div className="card-title">Product collaboration</div>I thrive when
            working closely with designers + researchers to build delightful,
            engaging web products.{" "}
            <em>
              E.g. data viz, games, marketing pages, animation, search
              experiences
            </em>
          </li>
          <li>
            <div className="card-title">Performance optimization</div>
            I’m committed to ensuring a smooth and responsive experience for
            users. I believe performance is a complex problem that should be
            tackled with a data-driven and user-centric approach.
          </li>
        </ul>
        <p>
          <div className="card-title">
            Tools and frameworks I know fairly well:
          </div>
          TypeScript / JS, ESLint, Material UI, GitHub Actions, Visx, React,
          GraphQL, Storybook, D3, Tailwind, Chromatic, Webflow, Cloudflare,
          Jest, Webpack, S3, Vue, Redux, Vite
        </p>

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
