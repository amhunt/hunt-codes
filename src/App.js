import React, { Component } from 'react';
import './App.css';
import Transamerica from './transamerica.svg';
import GoldenGate from './gg-bridge.png';
import Balloon from './Balloon';
import Typed from 'typed.js';

const typedOptions = {
  strings: [
    'interested in frontend?',
    'interested in blockchain?',
    'interested in working together?',
    'hmu ^500 at andrew@hunt.codes^4000',
  ],
  typeSpeed: 40,
  smartBackspace: true,
  loop: true,
};

const NUM_BALLONS = 3;

class App extends Component {
  state = {
    sfCount: 0,
    hovered: false,
    clickCount: 0,
  };

  componentDidMount() {
    const balloon = document.getElementById('balloons');
    balloon.addEventListener('mouseenter', this.onMouseEnter);
    balloon.addEventListener('mouseleave', this.onMouseLeave);
    this.typed = new Typed(this.el, typedOptions);
  }

  handleSFPress = () => {
    this.setState(({ sfCount }) => ({ sfCount: (sfCount + 1) % 3 }));
  }

  handleBalloonClick = () => {
    this.setState(({ clickCount }) => ({
      clickCount: clickCount + 1,
    }));
  }

  onMouseEnter = () => {
    this.setState({ hovered: true });
  }

  onMouseLeave = () => {
    this.setState({ hovered: false });
  }

  render() {
    const { sfCount, clickCount } = this.state;
    const balloonArr = new Array(NUM_BALLONS).fill(0);
    return (
      <div className="App App-background">
        <div className="App-background App-background2">
          <div
            id="balloons"
            onClick={this.handleBalloonClick}
            style={{ left: '30vw' }}
            className="App-balloon"
          >
            {balloonArr.map((_, index) => (
              <Balloon
                key={index + clickCount * 5}
                flipped={index % 2 === 1}
                hovered={this.state.hovered}
                paddingLeft={-index * 40}
              />
            ))}
          </div>
          <div className="App-info">
            <p>
              <a
                target="_blank"
                rel="noopener noreferrer"
                href="https://www.linkedin.com/in/andrewmhunt/"
              >
                andrew hunt
              </a>
            </p>
            <p>
              <a target="_blank" rel="noopener noreferrer" href="https://www.github.com/amhunt">
                software development
              </a>
            </p>
            <p>
              <button onClick={this.handleSFPress}>san francisco</button>
            </p>
            <p>
              <span
                className="typed"
                ref={el => {
                  this.el = el;
                }}
              />
            </p>
          </div>
          <img
            className={`App-gg-bridge${sfCount > 0 ? ' App-gg-bridge-opaque' : ''}`}
            src={GoldenGate}
            alt="golden gate bridge"
          />
          <img
            className={`App-transamerica${sfCount > 1 ? ' App-transamerica-opaque' : ''}`}
            src={Transamerica}
            alt="sf building"
          />
        </div>
      </div>
    );
  }
}

export default App;
