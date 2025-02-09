import React, { useEffect, useState } from "react";
import cx from "classnames";
import { ArrowLeftCircle, Calendar } from "react-feather";
import { useInView } from "react-intersection-observer";
import { Link } from "react-router-dom";
import useWindowSize from "useWindowSize";
import SunSvg, { SunInternals } from "SunSvg";

const Landing = () => {
  useEffect(() => {
    const planet1 = document.getElementById(
      "planet1"
    ) as unknown as SVGCircleElement;
    const planet2 = document.getElementById(
      "planet2"
    ) as unknown as SVGCircleElement;
    const planet3 = document.getElementById(
      "planet3"
    ) as unknown as SVGCircleElement;
    const planet4 = document.getElementById(
      "planet4"
    ) as unknown as SVGCircleElement;

    let angle1 = 0,
      angle2 = 0,
      angle3 = 0,
      angle4 = 0;

    function animate() {
      // Spin me faster, master
      angle1 += 0.5;
      angle2 += 0.8;
      angle3 += 1.2;
      angle4 += 1.6;

      const rad1 = (angle1 * Math.PI) / 180;
      const rad2 = (angle2 * Math.PI) / 180;
      const rad3 = (angle3 * Math.PI) / 180;
      const rad4 = (angle4 * Math.PI) / 180;

      const orbit1 = 120,
        orbit2 = 160,
        orbit3 = 200,
        orbit4 = 240;

      const x1 = 300 + orbit1 * Math.cos(rad1);
      const y1 = 300 + orbit1 * Math.sin(rad1);
      const x2 = 300 + orbit2 * Math.cos(rad2);
      const y2 = 300 + orbit2 * Math.sin(rad2);
      const x3 = 300 + orbit3 * Math.cos(rad3);
      const y3 = 300 + orbit3 * Math.sin(rad3);
      const x4 = 300 + orbit4 * Math.cos(rad4);
      const y4 = 300 + orbit4 * Math.sin(rad4);

      if (planet1) {
        planet1.setAttribute("cx", x1.toString());
        planet1.setAttribute("cy", y1.toString());
      }
      if (planet2) {
        planet2.setAttribute("cx", x2.toString());
        planet2.setAttribute("cy", y2.toString());
      }
      if (planet3) {
        planet3.setAttribute("cx", x3.toString());
        planet3.setAttribute("cy", y3.toString());
      }
      if (planet4) {
        planet4.setAttribute("cx", x4.toString());
        planet4.setAttribute("cy", y4.toString());
      }

      requestAnimationFrame(animate);
    }

    animate();
  }, []);

  return (
    <div
      style={{
        margin: 0,
        overflow: "hidden",
        position: "fixed",
        inset: 0,
        zIndex: 1000,
      }}
      className="landing-page"
    >
      <div className="absolute top-0 left-0 w-full h-full"></div>
      <svg id="solar-system" viewBox="0 0 600 600" style={{ display: "block" }}>
        <SunInternals />
        <circle id="sun" cx="300" cy="300" r="40" fill="gold" />
        <circle
          className="planet"
          id="planet1"
          cx="300"
          cy="180"
          r="12"
          fill="#aaa"
        />
        <circle
          className="planet"
          id="planet2"
          cx="300"
          cy="140"
          r="8"
          fill="#aaa"
        />
        <circle
          className="planet"
          id="planet3"
          cx="300"
          cy="100"
          r="6"
          fill="#aaa"
        />
        <circle
          className="planet"
          id="planet4"
          cx="300"
          cy="60"
          r="5"
          fill="#aaa"
        />
      </svg>
    </div>
  );
};
export default React.memo(Landing);
