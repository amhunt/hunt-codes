import React, { useEffect, useState } from "react";
import { ArrowLeftCircle } from "react-feather";
import { Link } from "react-router-dom";

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
        <Link to="/">
          <ArrowLeftCircle size={40} />
        </Link>
        <h1>About me</h1>
        <p>
          Hey! I’m a web engineer in San Francisco. For consulting inquiries,
          reach out to{" "}
          <a href="mailto:andrew@hunt.codes?Subject=Hey%20Andrew">
            andrew@hunt.codes
          </a>
          .
        </p>
        <h4>Work I love:</h4>
        <ul>
          <li>
            Frontend architecture and dev experience: increase frontend dev
            velocity, reduce bugs, and improve product/UX quality
          </li>
          <li>Component systemization</li>
          <li>
            Product: Working closely with designers + researchers to build
            delightful, interactive web products
            <ul>
              <li>
                <em>
                  E.g. data viz, games, marketing pages, animation, search
                  experiences
                </em>
              </li>
            </ul>
          </li>
          <li>Performance optimization</li>
        </ul>
        <p>
          <b>Things I know well</b> (in order)<b>:</b> TypeScript/JavaScript,
          React, ESLint, Webpack, D3, Visx, Webflow, Jest, Storybook, Chromatic,
          Redux, S3, Cloudflare, Material UI, GitHub Actions, GraphQL, Vue
        </p>
        <p>
          <b>
            Things I know <em>less</em> well:
          </b>{" "}
          Python, Tailwind CSS, Bootstrap, Solidity, Java
        </p>
        <h2>Experience</h2>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineer, ZipHQ, San Francisco
          </h3>
          <h3 className="secondSplitRowItem">2021 - Present</h3>
        </div>
        <li>Build new features and pages across the product</li>
        <li>
          Componentization: Lead efforts to dedupe, standardize, and improve
          interactions for shared components, swapping out Bootstrap for
          Material UI
        </li>
        <li>
          Dev infra – CI/Quality:
          <ul>
            <li>TypeScript correctness + coverage CI checks</li>
            <li>
              Testing: Jest unit testing, Datadog Synthetic tests, and visual
              regression testing via Storybook/Chromatic
            </li>
            <li>Built FE/BE logging system with Segment</li>
          </ul>
        </li>
        <li>
          Dev infra – build + deploy: Architected much of Zip&apos;s current
          frontend build systems, across Webpack, Jenkins, Docker, S3,
          Cloudflare, and Webflow (marketing site)
        </li>
        <li>
          Dev experience: enabled hot reloads, sourcemaps, and robust lint rules
          to encourage modern, standardized TS/React practices
        </li>
        <li>
          TypeScript: enabled TypeScript and led migration of frontend code to
          90% coverage
        </li>
        <li>
          Performance: reduced page load times by 50%, primarily via code
          splitting (70% core bundle size reduction) and routing optimization
        </li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineer, Untapped (fka Jumpstart), San Francisco
          </h3>
          <h3 className="secondSplitRowItem">2020 - 2021</h3>
        </div>
        <li>Built out Recruiter Analytics platform</li>
        <li>Introduced TypeScript to the codebase and evangelized</li>
        <li>
          Led frontend platform group, overseeing all quality and performance
          initiatives
        </li>
        <li>Improved core app performance by 40%</li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineer, Airbnb, San Francisco
          </h3>
          <h3 className="secondSplitRowItem">2017 - 2020</h3>
        </div>
        <li>
          Built dozens of pricing and availability features across Experiences
          host and guest products
        </li>
        <li>
          Ran &gt;20 A/B tests, resulting in a compounded bookings lift of
          &gt;10% for the Experiences product
        </li>
        <li>
          Planned and executed on performance initiatives, reducing load times
          by &gt;30% on 10+ pages
        </li>
        <li>
          Oversaw conversion of legacy code to TypeScript, evangelized best
          practices across org
        </li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineering Intern, Airbnb, San Francisco
          </h3>
          <h3 className="secondSplitRowItem">Summer 2016</h3>
        </div>
        <li>Built landing pages for new features</li>
        <li>Contributed components to company frontend framework</li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineering Intern, AetherWorks, New York
          </h3>
          <h3 className="secondSplitRowItem">Summer 2015</h3>
        </div>
        <li>
          Built backend job to process usage data and connect with Slack and
          Geckoboard integrations
        </li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Software Engineering Intern, Lewis-Sigler Institute, Princeton
          </h3>
          <h3 className="secondSplitRowItem">Summer 2014</h3>
        </div>
        <li>
          Designed force-directed graph clustering algorithm to identify gene
          functions
        </li>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Product Management Intern, Autodesk, Portland
          </h3>
          <h3 className="secondSplitRowItem">Summer 2013</h3>
        </div>
        <li>
          Conducted user research sessions on Autodesk professional products
        </li>
        <li>Helped design + build a gamified CAD learning app for students</li>
        <li>
          Built CAD-based interactive tutorials for Lego Mindstorm release
        </li>
        <h2>Education</h2>
        <div className="splitRow">
          <h3 className="firstSplitRowItem">
            Princeton University, BSE, Computer Science
          </h3>
          <h3 className="secondSplitRowItem">September 2013 — June 2017</h3>
        </div>
        <h2>Other interests</h2>
        Music - production/voice/piano, Crosswords, Politics, Running, Web3
      </div>
    </div>
  );
};

export default Resume;
