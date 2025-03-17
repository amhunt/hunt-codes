import React, { useState, useEffect } from "react";
import {
  BrowserRouter as Router,
  Switch,
  Route,
  useLocation,
} from "react-router-dom";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import AppBackground from "AppBackground";
import Landing from "Landing";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (let c of andrewHunt) {
  nameArr.push(c);
}

const App = () => {
  const [showBridge, setShowBridge] = useState(false);
  const [mode, setMode] = useState<"day" | "night">("night");

  useEffect(() => {
    if (window.location.pathname.includes("about")) {
      setMode("day");
    } else {
      setMode("night");
    }
  }, [window.location.pathname]);

  // fade home content in once mounted
  useEffect(() => {
    console.log("bro what r u doing in the console...");
    setTimeout(() => setShowBridge(true), 1500);
  }, []);

  return (
    <div className="App">
      <Router>
        <AppBackground showBridge={showBridge} />
        <Switch>
          <Route exact path="/">
            <Landing />
          </Route>
          <Route path="/home">
            <Home />
          </Route>
          <Route path="/about">
            <Resume />
          </Route>
        </Switch>
      </Router>
    </div>
  );
};

export default App;
