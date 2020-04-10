import React, { Component } from "react";
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

export default class Home extends Component {
  state = {
    cursorPositionX: 0,
    cursorPositionY: 0,
    hovered: false,
    logoOpacity: 0,
  };

  componentDidMount() {
    const logo = document.getElementById("leftHalf");
    console.log(logo);
    if (logo) {
      logo.addEventListener("mouseenter", this.onMouseEnter, { passive: true });
      logo.addEventListener("mouseleave", this.onMouseLeave, { passive: true });
    }
    new Typed(this.el, typedOptions);
    document.onmousemove = this.getCursorXY;

    setTimeout(() => this.setState({ logoOpacity: 1 }), 1500);
  }

  getCursorXY = (e) => {
    const cursorPositionX = window.Event
      ? e.pageX
      : e.clientX +
        (document.documentElement.scrollLeft
          ? document.documentElement.scrollLeft
          : document.body.scrollLeft);
    const cursorPositionY = window.Event
      ? e.pageY
      : e.clientY +
        (document.documentElement.scrollTop
          ? document.documentElement.scrollTop
          : document.body.scrollTop);
    this.setState({ cursorPositionX, cursorPositionY });
  };

  onMouseEnter = () => {
    this.setState({ hovered: true });
  };

  onMouseLeave = () => {
    this.setState({ hovered: false });
  };

  render() {
    const { handleSFPress, homeOpacity } = this.props;
    const {
      cursorPositionX,
      cursorPositionY,
      hovered,
      logoOpacity,
    } = this.state;

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
          id="leftHalf"
          onClick={this.handleBalloonClick}
          className="logoWrapper"
          style={{ opacity: logoOpacity ? 1 : 0 }}
        >
          <Logo hovered={hovered} {...(!isSmall && logoPositioningProps)} />
        </div>
        <div className="homeInfoContainer" style={{ opacity: homeOpacity }}>
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
            <span
              className="typed"
              ref={(el) => {
                this.el = el;
              }}
            />
          </p>
        </div>
      </>
    );
  }
}
