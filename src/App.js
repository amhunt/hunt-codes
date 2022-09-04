import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import Galaxy from "./Galaxy.tsx";

import "./App.css";
import GoldenGate from "./gg-bridge.png";
import Home from "./Home";
import Resume from "./Resume";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr = [];
for (let c of andrewHunt) {
  nameArr.push(c);
}

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  const [homeOpacity, setHomeOpacity] = useState(0);
  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);
  const [highlightedCharIdx2, setHighlightedCharIdx2] = useState(0);

  // fade home content in once mounted
  useEffect(() => {
    setHomeOpacity(1);
    setTimeout(() => setShowBridge(true), 500);
  }, []);
  useEffect(() => {
    const interval = setInterval(
      () => setHighlightedCharIdx((highlightedCharIdx + 1) % nameArr.length),
      200
    );

    return () => {
      clearInterval(interval);
    };
  }, [highlightedCharIdx]);

  useEffect(() => {
    const interval2 = setInterval(
      () => setHighlightedCharIdx2((highlightedCharIdx2 + 1) % nameArr.length),
      300
    );
    return () => {
      clearInterval(interval2);
    };
  }, [highlightedCharIdx2]);

  const dimHeader = window.location?.pathname?.includes("resume");

  return (
    <div className="App ">
      <svg
        className="nameTitle"
        viewBox="0 0 100 20"
        xmlns="http://www.w3.org/2000/svg"
        style={
          dimHeader
            ? { opacity: 0.3, fill: "white", pointerEvents: "none" }
            : null
        }
      >
        <g y="-1" textLength="100%" alignmentBaseline="hanging" color="#004225">
          {nameArr.map((c, idx) => (
            <text
              key={idx}
              textLength="100%"
              x={idx * 10}
              className={`headerCharacter ${
                highlightedCharIdx === idx ? "highlighted" : ""
              } ${highlightedCharIdx2 === idx ? "highlighted2" : ""}`}
              alignmentBaseline="hanging"
            >
              {c}
            </text>
          ))}
        </g>
      </svg>
      <Router>
        <Switch>
          <Route exact path="/">
            <Home homeOpacity={homeOpacity} setHomeOpacity={setHomeOpacity} />
          </Route>
          <Route path="/resume">
            <Resume />
          </Route>
        </Switch>
      </Router>
      <div className="App-background"></div>
      <Galaxy />
      <div style={{ height: "100vh" }}>
        <img
          className={`App-gg-bridge${
            showBridge ? " App-gg-bridge-opaque" : ""
          }`}
          src={GoldenGate}
          alt="golden gate bridge"
        />
      </div>
    </div>
  );
};

export default App;
