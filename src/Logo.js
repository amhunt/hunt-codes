import React, { Component } from "react";

import "./App.css";

const letters = "0123456789ABCDEF";

function getRandomColor() {
  let color = "#";
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 6)];
  }
  return color;
}

function invertHex(hex) {
  const sansPound = hex.slice(1);
  return (Number(`0x1${sansPound}`) ^ 0xffffff)
    .toString(16)
    .substr(1)
    .toUpperCase();
}

class Logo extends Component {
  state = {
    strokeColor: getRandomColor(),
  };

  componentDidMount() {
    setInterval(this.changeColor, 500);
  }

  changeColor = () => {
    if (!this.props.hovered) {
      this.setState({ strokeColor: getRandomColor() });
    }
  };

  render() {
    const { hovered, paddingLeft, paddingTop } = this.props;
    const { strokeColor } = this.state;

    return (
      <>
        {/* Square */}
        <svg
          id="spinner"
          width="263"
          height={`calc(100vh - ${hovered ? 280 : 300}px)`}
          viewBox="0 0 263 265"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            overflow: "visible",
            left: paddingLeft,
            top: paddingTop,
          }}
        >
          <path
            d="M263 0L26.4015 7.91045L0 256.101L252.846 265L263 0Z"
            fill="url(#paint0_linear)"
          />
          <defs>
            <linearGradient
              id="paint0_linear"
              x1="131.5"
              y1="0"
              x2="131.5"
              y2="265"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={strokeColor} />
              <stop offset="1" stopOpacity="0" />
            </linearGradient>
          </defs>
        </svg>
        {/* Triangle */}
        <svg
          id="spinner"
          width="255"
          height={`calc(100vh - ${hovered ? 490 : 500}px)`}
          viewBox="0 0 255 327"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{
            position: "absolute",
            overflow: "visible",
            left: paddingLeft * 1.7 + 50,
            top: paddingTop * 1.7,
          }}
        >
          <path
            d="M0.591187 44L159 327L255 25C119 -24 45.8689 12 0.591187 44Z"
            fill="url(#paint1_linear)"
            fillOpacity="0.5"
          />
          <defs>
            <linearGradient
              id="paint1_linear"
              x1="109"
              y1="-50"
              x2="208"
              y2="481"
              gradientUnits="userSpaceOnUse"
            >
              <stop stopColor={`#${invertHex(strokeColor)}`} />
              <stop offset="1" />
            </linearGradient>
          </defs>
        </svg>
      </>
    );
  }
}

export default Logo;
