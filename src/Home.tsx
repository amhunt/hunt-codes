import React, { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import Typed from "typed.js";

import Logo from "./Logo";
import {
  Briefcase,
  Info,
  GitHub,
  Linkedin,
  Mail,
  Columns,
} from "react-feather";

const typedOptions = {
  loop: true,
  smartBackspace: true,
  strings: [
    "^5000interested in working together?",
    "andrew^500@hunt.codes^6000",
  ],
  typeSpeed: 40,
};

const Home = ({ homeOpacity }: { homeOpacity: number }) => {
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
    const typed = new Typed("#typed-js", typedOptions);
    document.onmousemove = getCursorXY;

    const timeout = setTimeout(() => setLogoOpacity(1), 1000);
    return () => {
      clearTimeout(timeout);
      typed.destroy();
    };
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
    if (window.innerWidth < 768) {
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
        className="logoWrapper flex items-center justify-center h-full pointer-events-none md:w-[50%] w-full"
        style={{ opacity: logoOpacity ? 1 : 0 }}
      >
        <Logo {...(!isSmall && logoPositioningProps)} />
      </div>
      <main
        className="w-[400px] homeInfoContainer"
        style={{ opacity: homeOpacity }}
      >
        <p className="hoverableHomeItem justify-between">
          <Link className="flex items-center gap-2" to="/about">
            <span className="hiddenEmoji">
              <Info />
            </span>
            about me
          </Link>
          <div className="flex items-center gap-1">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full hover:bg-gray-300"
            >
              <Linkedin />
            </a>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.github.com/amhunt"
              className="flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full hover:bg-gray-300"
            >
              <GitHub />
            </a>
          </div>
        </p>
        <p className="hoverableHomeItem">
          <span className="hiddenEmoji">
            <Briefcase className="purp" />
          </span>
          <span>
            staff eng @{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.ziphq.com"
            >
              ziphq.com
            </a>
          </span>
        </p>
        <p>
          <a
            className="hoverableHomeItem"
            target="_blank"
            rel="noopener noreferrer"
            href="https://engineering.ziphq.com/material-ui/"
          >
            <span className="hiddenEmoji">
              <Columns />
            </span>
            material ui blog post
          </a>
        </p>
        <p className="h-20 hoverableHomeItem">
          <span className="hiddenEmoji">
            <Mail />
          </span>
          <span
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
