import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "./App.css";
import Transamerica from "./transamerica.svg";
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
  const [sfCount, setSfCount] = useState(0);
  const [homeOpacity, setHomeOpacity] = useState(0);
  const handleSFPress = (optionalForce) =>
    setSfCount(
      typeof optionalForce != "undefined" ? optionalForce : (sfCount + 1) % 3
    );
  const [highlightedCharIdx, setHighlightedCharIdx] = useState(0);
  const [highlightedCharIdx2, setHighlightedCharIdx2] = useState(0);

  // fade home content in once mounted
  useEffect(() => setHomeOpacity(1), []);
  useEffect(() => {
    const interval = setInterval(
      () => setHighlightedCharIdx((highlightedCharIdx + 1) % nameArr.length),
      200
    );
    console.log("setInterval");

    return () => {
      clearInterval(interval);
    };
  }, [highlightedCharIdx]);

  useEffect(() => {
    const interval2 = setInterval(
      () => setHighlightedCharIdx2((highlightedCharIdx2 + 1) % nameArr.length),
      300
    );
    console.log("setInterval");
    return () => {
      clearInterval(interval2);
    };
  }, [highlightedCharIdx2]);

  console.log(window.location?.pathname);
  const dimHeader = window.location?.pathname?.includes("resume");

  return (
    <div className="App App-background">
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
            <Home
              homeOpacity={homeOpacity}
              setHomeOpacity={setHomeOpacity}
              handleSFPress={handleSFPress}
            />
          </Route>
          <Route path="/resume">
            <Resume handleSFPress={handleSFPress} />
          </Route>
        </Switch>
      </Router>
      <div style={{ height: "100vh" }}>
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
};

export default App;
