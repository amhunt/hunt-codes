import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import "./App.css";

const Resume = ({ handleSFPress }) => {
  const [opacity, setOpacity] = useState(false);
  useEffect(() => {
    const timer = setTimeout(() => {
      setOpacity(true);
    }, 1500);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="resume-container" style={{ opacity: opacity ? 1 : 0 }}>
      <Link to="/" onClick={() => handleSFPress(0)}>
        Back
      </Link>
      <h1>Andrew Hunt</h1>
      <p>
        Hey! I’m a developer in San Francisco who enjoys building delightful
        products. I'm currently specializing in frontend development. For
        consulting inquiries, please email me at{" "}
        <a href="mailto:andrew@hunt.codes?Subject=Hey%20Andrew">
          andrew@hunt.codes
        </a>
        .
      </p>
      <h2>Experience</h2>
      <div className="splitRow">
        <h3 className="firstSplitRowItem">
          Software Engineer, Airbnb, San Francisco
        </h3>
        <h3 className="secondSplitRowItem">2017 - Present</h3>
      </div>
      <li>
        Built dozens of pricing and availability features across Experiences
        host and guest products
      </li>
      <li>
        Ran &gt;20 A/B tests, resulting in a compounded Experiences bookings
        lift of &gt;10%
      </li>
      <li>
        Planned and executed on performance initiatives, improving TTI by
        &gt;30% on 10+ pages
      </li>
      <li>
        Oversaw conversion of legacy code to TypeScript, evangelized best
        practices across org
      </li>
      <li>
        Migrated the Experience Host web app from Rails to an Express framework
      </li>
      <li>
        Worked extensively in React, Redux, TypeScript, Rails, Apollo GraphQL,
        Node
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
      <h2>Education</h2>
      <div className="splitRow">
        <h3 className="firstSplitRowItem">
          Princeton University, BSE, Computer Science
        </h3>
        <h3 className="secondSplitRowItem">September 2013 — June 2017</h3>
      </div>
      <h2>Skills</h2>
      <li>Strong knowledge of JavaScript/TypeScript, React, Redux, HTML/CSS</li>
      <li>
        Proficiency in C, Java, Ruby on Rails, Python, SQL, Apollo GraphQL
      </li>
      <h2>Interests</h2>
      Music Production, Ethereum, A Cappella, Politics, Running, Crosswords
    </div>
  );
};

export default Resume;
