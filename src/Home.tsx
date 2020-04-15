import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Typed from "typed.js";

import "./App.css";
import Logo from "./Logo";

const typedOptions = {
  loop: true,
  smartBackspace: true,
  strings: [
    "^5000interested in working together?",
    "andrew^500@hunt.codes^6000",
  ],
  typeSpeed: 40,
};

const Home = ({ handleSFPress, homeOpacity }) => {
  const leftHalfEl = useRef<HTMLDivElement>(null); //React.createRef<HTMLDivElement>();

  const [hovered, setHovered] = useState(false);
  const [logoOpacity, setLogoOpacity] = useState(0);
  const [cursorPositionX, setCursorPositionX] = useState(0);
  const [cursorPositionY, setCursorPositionY] = useState(0);

  const getCursorXY = useCallback((e: MouseEvent) => {
    const cursorPositionX = window.Event
      ? e.pageX
      : e.clientX +
        (document?.documentElement?.scrollLeft || document.body.scrollLeft);
    const cursorPositionY = window.Event
      ? e.pageY
      : e.clientY +
        (document?.documentElement?.scrollTop || document.body.scrollTop);
    setCursorPositionX(cursorPositionX);
    setCursorPositionY(cursorPositionY);
  }, []);

  useEffect(() => {
    const logo = leftHalfEl.current;
    if (logo) {
      logo.addEventListener("mouseenter", () => setHovered(true), {
        passive: true,
      });
      logo.addEventListener("mouseleave", () => setHovered(false), {
        passive: true,
      });
    }

    new Typed("#typed-js", typedOptions);
    document.onmousemove = getCursorXY;

    setTimeout(() => setLogoOpacity(1), 1000);
  }, [getCursorXY]);

  const cursorRatioX = cursorPositionX
    ? (cursorPositionX / document.body.clientWidth) * 2 - 1
    : 0;
  const cursorRatioY = cursorPositionY
    ? (cursorPositionY / document.body.clientHeight) * 2 - 1
    : 0;

  let isSmall = false;
  let isMediumOrSmaller = false;
  let cursorMultiplier1 = 30;
  let cursorMultiplier2 = 50;
  if (typeof window !== "undefined") {
    if (window.innerWidth < 600) {
      isSmall = true;
    }
    if (window.innerWidth < 1000) {
      isMediumOrSmaller = true;
      cursorMultiplier1 = 15;
      cursorMultiplier2 = 25;
    }
  }
  const logoPositioningProps = {
    paddingLeft1: isSmall ? undefined : cursorMultiplier1 * cursorRatioX,
    paddingTop1: isSmall ? 0 : cursorMultiplier1 * cursorRatioY,
    paddingLeft2: isSmall
      ? undefined
      : cursorMultiplier2 * cursorRatioX + (isMediumOrSmaller ? 40 : 100),
    paddingTop2: isSmall ? 0 : cursorMultiplier2 * cursorRatioY - 80,
  };

  return (
    <>
      <div
        ref={leftHalfEl}
        className="logoWrapper"
        style={{ opacity: logoOpacity ? 1 : 0 }}
      >
        <Logo hovered={hovered} {...(!isSmall && logoPositioningProps)} />
      </div>
      <main className="homeInfoContainer" style={{ opacity: homeOpacity }}>
        <p>
          <Link
            className="color1"
            onClick={() => handleSFPress(1)}
            to="/resume"
          >
            andrew hunt
          </Link>
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.github.com/amhunt"
            className="color2"
          >
            software development
          </a>
        </p>
        <p>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.linkedin.com/in/andrewmhunt/"
            className="color3"
          >
            airbnb
          </a>
        </p>
        <p>
          <button className="color4" onClick={() => handleSFPress()}>
            san francisco
          </button>
        </p>
        <p className="color5">
          <span id="typed-js" className="typed" />
        </p>
      </main>
    </>
  );
};

export default Home;
