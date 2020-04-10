import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";

import "./App.css";
import Transamerica from "./transamerica.svg";
import GoldenGate from "./gg-bridge.png";
import Home from "./Home";
import Resume from "./Resume";

const App = () => {
  const [sfCount, setSfCount] = useState(0);
  const [homeOpacity, setHomeOpacity] = useState(0);

  const handleSFPress = (optionalForce) =>
    setSfCount(
      typeof optionalForce != "undefined" ? optionalForce : (sfCount + 1) % 3
    );

  useEffect(() => setHomeOpacity(1), []);

  return (
    <Router>
      <div className="App App-background">
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
    </Router>
  );
};

export default App;
