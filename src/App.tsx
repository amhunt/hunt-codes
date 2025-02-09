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
import { Music } from "react-feather";
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
    console.log("setting mode", window.location.pathname);
    if (window.location.pathname.includes("about")) {
      setMode("day");
    } else {
      setMode("night");
    }
  }, [window.location.pathname]);
  console.log(mode);

  // fade home content in once mounted
  useEffect(() => {
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
