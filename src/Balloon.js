import React, { Component } from 'react';
import './App.css';

const letters = '0123456789ABCDEF';
function getRandomColor() {
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
}

class Balloon extends Component {
  constructor(props) {
    super(props);
    this.state = {
      strokeColor: getRandomColor(),
    };

    this.changeColor = this.changeColor.bind(this);
  }

  componentDidMount() {
    this.changeColor();
  }

  changeColor() {
    if (!this.props.hovered) {
      this.setState({ strokeColor: getRandomColor() });
    }
    setTimeout(this.changeColor, 200);
  }

  render() {
    const { instanceNum, hovered, paddingLeft, rotateVal } = this.props;
    const { strokeColor } = this.state;
    return (
      <svg
        width="167px"
        height="450px"
        style={{
          transition: '10s',
          position: 'absolute',
          transform: `rotate3d(0, 1, 0, ${rotateVal}deg)`,
          overflow: 'visible',
          left: paddingLeft,
        }}
        viewBox="0 0 167 450"
        version="1.1"
        id={`balloon-${instanceNum}`}
        xmlns="http://www.w3.org/2000/svg"
      >
        <title>balloon</title>
        <g stroke="none" strokeWidth={hovered ? 5 : 3} fill="none" fillRule="evenodd">
          <g
            id="balloon"
            className="App-logo"
            transform="translate(0.932189, 1.011478)"
            stroke={strokeColor}
          >
            <path
              d="M50.8985937,181.673866 C29.5188196,178.202346 14.736623,153.666955 8.04826134,134.595806 C-7.32234945,90.7681509 -2.27640823,44.1192969 37.1745585,15.8802698 C43.8728936,11.0855973 57.1758244,2.51753854 66.8095864,1.75275846 C76.3881903,0.992357133 87.0234106,-2.03661695 95.6318146,2.23225181 C135.752912,22.1281229 180.25494,86.4901655 160.065195,132.373764 C138.710877,180.903993 105.194934,186.953077 56.6525139,192.614501"
              id="Path"
            />
            <path
              d="M54.1848774,186.474647 C53.584234,192.980627 47.085156,240.287532 42.0221193,241.405873 C40.9519056,241.642266 41.530931,239.269594 41.2853369,238.201454"
              id="Path-2"
            />
            <path
              d="M50.9687635,189.15864 C53.7916662,225.353444 86.305605,226.819208 37.045914,240.060953 C35.763818,240.405599 35.9465877,237.643994 35.3969246,236.435515"
              id="Path-3"
            />
            <path
              d="M51.1441879,197.35096 C94.9892268,202.56153 107.979991,255.315554 100.397511,293.512766 C95.2865281,319.259658 71.4708225,337.329271 66.5522973,363.384303 C62.7394516,383.58219 75.5889763,389.523508 85.9074556,406.889553 C97.3365969,426.124847 94.2294153,426.270756 93.8424858,448.400812"
              id="Path-4"
            />
          </g>
        </g>
      </svg>
    );
  }
}

export default Balloon;
