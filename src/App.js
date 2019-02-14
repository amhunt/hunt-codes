import React, { Component } from 'react';
import './App.css';
import Transamerica from './transamerica.svg';
import GoldenGate from './gg-bridge.png';
import Balloon from './Balloon';

class App extends Component {
  constructor(props) {
    super(props);

    this.state = {
      sfCount: 0,
      hovered: false,
      rotateVal: 0,
      numBalloons: 3,
    };

    this.handleSFPress = this.handleSFPress.bind(this);
    this.onMouseEnter = this.onMouseEnter.bind(this);
    this.onMouseLeave = this.onMouseLeave.bind(this);
    this.handleBalloonClick = this.handleBalloonClick.bind(this);
    this.rotate = this.rotate.bind(this);
  }

  componentDidMount() {
    const balloon = document.getElementById('balloons');
    balloon.addEventListener('mouseenter', this.onMouseEnter);
    balloon.addEventListener('mouseleave', this.onMouseLeave);
    this.rotate();
  }

  handleSFPress() {
    this.setState(({ sfCount }) => ({ sfCount: (sfCount + 1) % 3 }));
  }

  handleBalloonClick() {
    this.setState({ numBalloons: Math.floor(Math.random() * Math.floor(5) + 1) });
  }

  onMouseEnter() {
    this.setState({ hovered: true });
  }

  onMouseLeave() {
    this.setState({ hovered: false });
  }

  rotate() {
    this.setState(({ rotateVal }) => ({ rotateVal: rotateVal + 10 }));

    setTimeout(this.rotate, 100);
  }

  render() {
    const { sfCount, numBalloons, rotateVal } = this.state;
    const balloonArr = new Array(numBalloons).fill(0);
    return (
      <div className={`App App-background`}>
        <div
          id="balloons"
          onClick={this.handleBalloonClick}
          style={{ left: `${15 + numBalloons}vw` }}
          className="App-balloon"
        >
          {balloonArr.map((_, index) => (
            <Balloon
              key={index}
              rotateVal={rotateVal}
              hovered={this.state.hovered}
              paddingLeft={-index * 40}
            />
          ))}
        </div>
        <div className="App-name">
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
    );
  }
}

export default App;
