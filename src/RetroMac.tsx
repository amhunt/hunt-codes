import React from "react";
import Apple from "./assets/apple-rainbow.svg";
import "./computer.scss";

const RetroMac = () => {
  return (
    <div className="z-20 h-screen">
      <div className="z-20 stage">
        <div className="positioning animated">
          <div className="mac">
            <span className="back"></span>
            <span className="left"></span>
            <span className="right"></span>
            <span className="top"></span>
            <span className="base-front">
              <span className="keyboard-port"></span>
            </span>
            <span className="base-left"></span>
            <span className="base-right"></span>
            <span className="base-back"></span>
            <span className="front">
              <span className="bezel-top"></span>
              <span className="bezel-left"></span>
              <span className="bezel-right"></span>
              <span className="bezel-bottom"></span>
              <span className="screen-container">
                <span className="screen">
                  <span
                    id="typed-js"
                    className="typed"
                    aria-description="email address: andrew@hunt.codes"
                  />
                  <span className="sheen" />
                </span>
              </span>
              <span className="logo">
                <img src={Apple} alt="apple logo" className="image" />
                <span className="text" />
              </span>
              <span className="floppy" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RetroMac;
