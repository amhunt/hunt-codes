import React, { Component } from "react";
import Typed from "typed.js";

import "./App.css";
import Transamerica from "./transamerica.svg";
import GoldenGate from "./gg-bridge.png";
import Logo from "./Logo";

const typedOptions = {
  strings: ["interested in working together?", "andrew^500@hunt.codes^4000"],
  typeSpeed: 40,
  smartBackspace: true,
  loop: true,
};

class App extends Component {
  state = {
    cursorPositionX: 0,
    cursorPositionY: 0,
    hovered: false,
    sfCount: 0,
  };

  componentDidMount() {
    const balloon = document.getElementById("balloons");
    if (balloon) {
      balloon.addEventListener("mouseenter", this.onMouseEnter);
      balloon.addEventListener("mouseleave", this.onMouseLeave);
    }
    this.typed = new Typed(this.el, typedOptions);
    document.onmousemove = this.getCursorXY;
  }

  handleSFPress = () => {
    this.setState(({ sfCount }) => ({ sfCount: (sfCount + 1) % 3 }));
  };

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
    const { cursorPositionX, cursorPositionY, sfCount } = this.state;

    const cursorRatioX =
      (cursorPositionX / document.body.clientWidth) * 2 - 1 || 0;
    const cursorRatioY =
      (cursorPositionY / document.body.clientHeight) * 2 - 1 || 0;

    let isSmall = false;
    if (typeof window !== "undefined") {
      isSmall = window.innerWidth < 600;
    }

    return (
      <div className="App App-background">
        <div className="App-background App-background2">
          <div
            id="balloons"
            onClick={this.handleBalloonClick}
            style={{ left: "20vw" }}
            className="App-balloon"
          >
            <Logo
              hovered={this.state.hovered}
              paddingLeft={40 * cursorRatioX + (isSmall ? 48 : 0)}
              paddingTop={isSmall ? 16 : 40 * cursorRatioY}
            />
          </div>
          <div className="App-info">
            <p>andrew hunt</p>
            <p>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.github.com/amhunt"
              >
                software development
              </a>
            </p>
            <p>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/andrewmhunt/"
              >
                airbnb
              </a>
            </p>
            <p>
              <button onClick={this.handleSFPress}>san francisco</button>
            </p>
            <p>
              <span
                className="typed"
                ref={(el) => {
                  this.el = el;
                }}
              />
            </p>
          </div>
          <img
            className={`App-gg-bridge${
              sfCount > 0 ? " App-gg-bridge-opaque" : ""
            }`}
            src={GoldenGate}
            alt="golden gate bridge"
          />
          <img
            className={`App-transamerica${
              sfCount > 1 ? " App-transamerica-opaque" : ""
            }`}
            src={Transamerica}
            alt="sf building"
          />
        </div>
      </div>
    );
  }
}

export default App;
