import React, { useEffect, useState, useCallback, useRef } from "react";
import Typed from "typed.js";
import cx from "classnames";

import Logo from "./Logo";
import { GitHub, Linkedin } from "react-feather";
import useWindowSize from "useWindowSize";

const typedOptions = {
  loop: true,
  smartBackspace: true,
  strings: [
    "hey there^500,",
    "welcome to my website!",
    "there’s not much content...^500 but there plenty of (tasteless) css!",
    "^500interested in working together?",
    "reach out to andrew^200@hunt.codes^5000",
  ],
  typeSpeed: 50,
};

const Home = () => {
  const leftHalfEl = useRef<HTMLDivElement>(null);

  const [logoOpacity, setLogoOpacity] = useState(0);
  const [cursorPositionX, setCursorPositionX] = useState(0);
  const [cursorPositionY, setCursorPositionY] = useState(0);

  const size = useWindowSize();
  const isSmall = size === "sm";
  const isMdOrLess = size === "sm" || size === "md";

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

  const docHeight = window.innerHeight;
  const docWidth = window.innerWidth;
  const cursorRatioX = cursorPositionX
    ? (cursorPositionX / docWidth) * 2 - 1
    : 0;
  const cursorRatioY = cursorPositionY
    ? (cursorPositionY / docHeight) * 2 - 1
    : 0;
  let cursorMultiplier1 = 30;
  let cursorMultiplier2 = 50;

  if (isMdOrLess) {
    cursorMultiplier1 = 15;
    cursorMultiplier2 = 25;
  }

  const logoPositioningProps = {
    paddingLeft1: cursorMultiplier1 * cursorRatioX,
    paddingTop1: cursorMultiplier1 * cursorRatioY + 40,
    paddingLeft2: cursorMultiplier2 * cursorRatioX + (isMdOrLess ? 40 : 100),
    paddingTop2: cursorMultiplier2 * cursorRatioY,
  };

  return (
    <>
      <div
        ref={leftHalfEl}
        className="logoWrapper flex items-center justify-center pointer-events-none"
        style={{ opacity: logoOpacity ? 1 : 0 }}
      >
        <Logo {...(!isSmall && logoPositioningProps)} />
      </div>
      <main className={cx("homeInfoContainer", logoOpacity === 1 && "show")}>
        <p className="hoverableHomeItem justify-between">
          {/* <Link className="flex items-center gap-2" to="/about">
            <span className="hiddenEmoji">
              <Info />
            </span>
            About me
          </Link> */}
          <div className="flex items-center gap-2">
            {/* <span className="hiddenEmoji">
              <Briefcase className="purp" />
            </span> */}
            <span>
              Currently @{" "}
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.ziphq.com"
              >
                Zip
              </a>
            </span>
          </div>
          <div className="flex items-center gap-1">
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.linkedin.com/in/andrewmhunt/"
              className="flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full bg-opacity-25 hover:bg-[#5efffc57]"
            >
              <Linkedin />
            </a>
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.github.com/amhunt"
              className="flex transition-colors items-center justify-center w-12 h-12 p-2 rounded-full hover:bg-[#5efffc57]"
            >
              <GitHub />
            </a>
          </div>
        </p>
        {/* <p className="hoverableHomeItem">
          <span className="hiddenEmoji">
            <Briefcase className="purp" />
          </span>
          <span>
            Currently @{" "}
            <a
              target="_blank"
              rel="noopener noreferrer"
              href="https://www.ziphq.com"
            >
              Zip
            </a>
          </span>
        </p> */}
        {/* <p>
          <a
            className="hoverableHomeItem"
            target="_blank"
            rel="noopener noreferrer"
            href="https://engineering.ziphq.com/material-ui/"
          >
            <span className="hiddenEmoji">
              <Edit3 />
            </span>
            material ui blog post
          </a>
        </p> */}
        <p className="h-20 hoverableHomeItem">
          {/* <span className="hiddenEmoji"> */}
          {/* <Mail className="purp" /> */}
          {/* </span> */}
          <span>
            <span
              id="typed-js"
              className="typed"
              aria-label="email address: andrew@hunt.codes"
            />
          </span>
        </p>
      </main>
    </>
  );
};

export default Home;
