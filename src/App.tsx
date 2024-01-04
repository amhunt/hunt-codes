import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Switch, Route } from "react-router-dom";
import "./App.scss";

import Home from "./Home";
import Resume from "./Resume";
import AppBackground from "AppBackground";

// Needed to get hover state on individual chars
const andrewHunt = "andrewhunt";
const nameArr: string[] = [];
for (let c of andrewHunt) {
  nameArr.push(c);
}

const App = () => {
  const [showBridge, setShowBridge] = useState(false);

  // fade home content in once mounted
  useEffect(() => {
    setTimeout(() => setShowBridge(true), 1500);
  }, []);

  return (
    <div className="App">
      <Router>
        <Switch>
          <Route exact path="/">
            <Home />
          </Route>
          <Route path="/about">
            <Resume />
          </Route>
        </Switch>
        <AppBackground showBridge={showBridge} />
      </Router>
    </div>
  );
};

export default App;
