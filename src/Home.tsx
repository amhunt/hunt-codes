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
  const leftHalfEl = useRef<HTMLDivElement>(null);

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
        <Logo {...(!isSmall && logoPositioningProps)} />
      </div>
      <main className="homeInfoContainer" style={{ opacity: homeOpacity }}>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌕 </span>
          <span>
            engineering at&nbsp;
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.ziphq.com"
            >
              zip
            </a>
          </span>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌖 </span>
          <Link onClick={() => handleSFPress(1)} to="/resume">
            resume
          </Link>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌗 </span>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.linkedin.com/in/andrewmhunt/"
          >
            linkedin
          </a>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌘 </span>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://www.github.com/amhunt"
          >
            github
          </a>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌑 </span>
          <a
            target="_blank"
            rel="noopener noreferrer"
            href="https://andrew-hunt.medium.com/"
          >
            blog
          </a>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌒 </span>
          <button onClick={() => handleSFPress()}>san francisco</button>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">🌓</span>
          <a
            href="mailto:andrew@hunt.codes"
            id="typed-js"
            className="typed"
            aria-label="email address: andrew@hunt.codes"
          />
        </p>
      </main>
    </>
  );
};

export default Home;
