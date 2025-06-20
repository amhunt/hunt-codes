import React, { useEffect, useState, useCallback, useMemo } from "react";
import useWindowSize from "useWindowSize";

// Pantone colors of the years 2000 - 2020
// except for 2006 and 2015 🤮
const colorOptions = [
  "#9BB7D4",
  "#C74375",
  "#BF1932",
  "#7BC4C4",
  "#E2583E",
  "#53B0AE",
  "#9B1B30",
  "#5A5B9F",
  "#F0C05A",
  "#45B5AA",
  "#D94F70",
  "#DD4124",
  "#009473",
  "#B163A3",
  "#F7CAC9",
  "#92A8D1",
  "#88B04B",
  "#5F4B8B",
  "#FF6F61",
  "#0F4C81",
];

function getPantoneColor() {
  return colorOptions[Math.floor(Math.random() * colorOptions.length)];
}

const MIRROR_OFFSET_PX = 80;

const Logo = ({
  paddingLeft1,
  paddingTop1,
  paddingLeft2,
  paddingTop2,
}: {
  paddingLeft1?: number;
  paddingTop1?: number;
  paddingLeft2?: number;
  paddingTop2?: number;
}) => {
  const size = useWindowSize();
  const [strokeColor1, setStrokeColor1] = useState(getPantoneColor());
  const [strokeColor2, setStrokeColor2] = useState(getPantoneColor());
  const changeColor = useCallback(() => {
    setStrokeColor1(getPantoneColor());
    setStrokeColor2(getPantoneColor());
  }, []);

  useEffect(() => {
    const interval = setInterval(changeColor, 2000);
    return () => clearInterval(interval);
  }, [changeColor]);

  const svgStyle1 = useMemo(
    () => ({
      left: paddingLeft1,
      top: paddingTop1,
      WebkitBoxReflect:
        size === "sm"
          ? undefined
          : `below ${
              MIRROR_OFFSET_PX - (paddingTop1 ?? 0)
            }px linear-gradient(transparent 0%, transparent 50%, #000d 100%)`,
    }),
    [size, paddingLeft1, paddingTop1]
  );

  const svgStyle2 = useMemo(
    () => ({
      left: paddingLeft2,
      top: paddingTop2,
      WebkitBoxReflect:
        size === "sm"
          ? undefined
          : `below ${
              MIRROR_OFFSET_PX - (paddingTop2 ?? 0)
            }px linear-gradient(transparent 0%, transparent 50%, #000d 100%)`,
    }),
    [size, paddingLeft2, paddingTop2]
  );

  return (
    <>
      {/* Square */}
      <svg
        viewBox="0 0 263 265"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logoComponent logo1"
        style={svgStyle1}
      >
        <path
          d="M263 0L26.4015 7.91045L0 256.101L252.846 265L263 0Z"
          fill="url(#paint0_linear)"
        />
        <defs>
          <linearGradient
            id="paint0_linear"
            x1="131.5"
            y1="0"
            x2="131.5"
            y2="290"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" stopColor="#fff" />
            <stop stopOpacity="1" stopColor={strokeColor1} />
          </linearGradient>
        </defs>
      </svg>
      {/* Triangle */}
      <svg
        viewBox="0 0 255 327"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="logoComponent logo2"
        style={svgStyle2}
      >
        <path
          d="M0.591187 44L159 327L255 25C119 -24 45.8689 12 0.591187 44Z"
          fill="url(#paint1_linear)"
        />
        <defs>
          <linearGradient
            id="paint1_linear"
            x1="109"
            y1="-50"
            x2="208"
            y2="481"
            gradientUnits="userSpaceOnUse"
          >
            <stop stopOpacity="0" stopColor="#fff" />
            <stop stopOpacity="1" stopColor={strokeColor2} />
          </linearGradient>
        </defs>
      </svg>
    </>
  );
};

export default Logo;
