import { createLucideIcon } from "lucide-react";

/**
 * Andrew's signature "A" as an icon: the mark on the corner coin and the
 * favicon (public/signature-a.svg), standing in for a shopping bag on the
 * links to his shop — /home's icon pill and the Artifacts card on
 * /projects-and-toys. The shop is "Artifacts by Andy", so his own mark
 * names it better than a generic bag does.
 *
 * Built on lucide's chassis via `createLucideIcon`, like GalaxyIcon, so
 * it takes the same `size` / `className` props as the imported icons
 * beside it and lands in the same box. The signature is a filled shape,
 * not a stroke, so its path opts out of the chassis' stroke and fills
 * with `currentColor` — it follows the link's text colour. (lucide's
 * `color` prop maps to `stroke`, so it doesn't reach this one; set the
 * CSS colour instead.)
 *
 * Sizing: the artwork's box is scaled to GLYPH_HEIGHT units tall and
 * centred in the 24-unit grid — y 1 to 23, x ~2.4 to ~21.6. That is the
 * box the ShoppingBag it replaces paints (a 20 x 22 outline once its 2px
 * stroke is counted) and the most lucide's 1-unit padding allows, so at
 * any `size` it reads as big as its neighbours.
 *
 * The path data is public/signature-a.svg's, verbatim — the transform
 * does the fitting, so the two can be diffed, and SignatureIcon.test.js
 * holds them together.
 */
const GRID = 24;
/** public/signature-a.svg's viewBox, which is cropped to the artwork */
const ART_WIDTH = 173.91;
const ART_HEIGHT = 198.63;
const GLYPH_HEIGHT = 22;
const SCALE = GLYPH_HEIGHT / ART_HEIGHT;
const OFFSET_X = (GRID - ART_WIDTH * SCALE) / 2;
const OFFSET_Y = (GRID - GLYPH_HEIGHT) / 2;

const SIGNATURE_PATH =
  "M173.91,111.43l-13.26-11.12h-27.69l-1.95-87.93-.06-.9-.2-1.34-.27-1.08-.47-1.3-.88-1.72-.78-1.12-.73-.86-1.61-1.46-1.65-1.06-1.22-.58-1.08-.39-1.31-.33-1.11-.17-1.59-.08-1.38.12-1.63.33-1.1.34-1.44.64-1.41.85-1.3,1.04-1.14,1.19-.96,1.28-57.65,94.51-29.24.02-1.54.17-.89.19-1.39.45-1.4.65-.8.47-1.15.86-1.12,1.07-.99,1.23-.81,1.33-.87,2.17-.36,1.65-.13,1.71.08,1.29.27,1.55.48,1.5.35.82.71,1.27,1.26,1.7,17.41,12.92L1.86,179.31l-.66,1.24-.6,1.53-.43,1.76-.18,1.76.06,1.4.25,1.63.46,1.58.66,1.52.47.84.89,1.25,1.11,1.22,1.28,1.07,1.39.89,1.49.7,1.58.5,2.54.44,48.11-14.74,3.09-18.38-16.73-1.58-9.38,3.67,13.93-20.84,64.96,34.01,1.4.59.92.29,1.53.31,1.85.14.78-.04,1.51-.2.94-.21,1.47-.5,1.49-.72.85-.52,1.2-.92.72-.67,1.01-1.16.57-.79.76-1.32.64-1.54.44-1.62.16-.95.09-1.68-.99-45.05h28l12.43-12.82ZM106.64,56.17l.98,44.14h-27.9l26.93-44.14ZM64.36,125.49l.75-1.24h43.03l.54,24.49-44.33-23.26Z";

const SignatureIcon = createLucideIcon("signature-a", [
  [
    "path",
    {
      d: SIGNATURE_PATH,
      transform: `translate(${OFFSET_X.toFixed(3)} ${OFFSET_Y}) scale(${SCALE.toFixed(5)})`,
      fill: "currentColor",
      fillRule: "evenodd",
      stroke: "none",
      key: "signature",
    },
  ],
]);

export default SignatureIcon;
