# /home layout — findings and a positioning plan

Written against the real app at 390×844, 834×1000, 1280×800 and 1728×1000
(the `Pages/Home` stories cover the same four). Nothing here is
implemented — it's a proposal to argue with.

## The one structural problem

Home has **two layout systems fighting over the same pixels**:

- a **DOM layer** positioned in CSS — the info panel, back link, audio
  pill, day/night switch, scroll hint, badge medallion;
- a **3D layer** whose link targets (Earth = ABOUT ME, the three
  asteroids, Sputnik, the rocket, the drum pad) are placed by orbital
  mechanics and projected to screen each frame.

Neither knows about the other, and the 3D layer *moves*. Every collision
below is a symptom of that, so the fix is mostly about giving each layer
its own reserved territory rather than nudging individual elements.

The screenshots make the drift concrete: in one capture at 390px the
asteroid trio sat mid-screen; seconds later Earth had swung into the same
space and the drum pad had risen into the info panel. Any plan that
assumes a fixed 3D position will be wrong a few seconds later.

## What's wrong, per breakpoint

### sm — 390×844 (the one that needs the most)

| Issue | Detail |
| --- | --- |
| Wordmark clipped | `andrewhunt` runs edge to edge; the `a` and `t` touch the bezel |
| Day/night switch overlaps it | The switch sits top-right, on top of the wordmark's last letters |
| Bad line break | "Frontend Engineer · ~~SF~~" / "NYC" — the city is orphaned onto line 2 |
| Bottom edge is a pile-up | Audio pill (nearly full width), scroll hint, badge medallion, and whatever 3D body has drifted low |
| 3D link targets are unreliable tap targets | Asteroids are small, moving, and sometimes behind the info panel |
| Info panel competes with the sun | The panel's dark plate sits over the sun's limb — legible, but visually muddy |

### md — 834×1000

- **The social icon row lands on Sputnik.** The clearest collision in the
  whole set: the LinkedIn/GitHub/Mail icons sit directly over the
  satellite's body and struts.
- Info text is pinned to `left: 5vw` while the icons sit mid-width, so the
  block reads as two disconnected fragments with a gap between them.
- Large dead zone through the upper middle.

### lg — 1280×800

- The best of the four; this is clearly what the layout was tuned for.
- The typed line truncates (`interes|`) — the container is too narrow for
  the longest string.
- Empty band across the upper middle, between wordmark and content.

### xl — 1728×1000

- Sparse. `left: 5vw` pushes the info block further from centre as the
  viewport grows, so content clusters upper-left while the right half
  holds only Earth and the rocket.
- `width: calc(22vw + 22vh)` keeps growing the panel, so the text line
  gets longer rather than the layout getting denser.

## Proposed positioning

### The principle

**Reserve horizontal bands for the DOM; leave the middle to the 3D.**
The DOM takes a top band (identity + back link) and a bottom band
(controls + hint). The 3D owns the middle, where it can drift without
hitting anything.

### sm — switch to a bottom sheet, and stop navigating in 3D

The biggest win available. Concretely:

1. **One panel, anchored bottom**, containing the summary line, the icon
   row, and the typed line — instead of a floating mid-screen block.
   Sits above the audio pill.
2. **Promote the 3D destinations into that panel as real links.** On
   touch, a moving 8px asteroid is not a tap target. Add About, Blog and
   Draw beside LinkedIn/GitHub/Mail, and let the 3D bodies be scenery on
   sm. This is the "different nav structure" worth taking.
3. **Hide on sm:** the badge medallion and the drum pad. Both are
   delightful and neither survives the space budget.
4. **Reserve the top third for the scene** so Earth has somewhere to be.
5. Fix the wrap: wrap `~~SF~~ NYC` in a `white-space: nowrap` span.
6. Shrink the wordmark to ~85% width and move the day/night switch into
   the bottom control cluster with the audio pill, off the wordmark.

Result: one tap-friendly card, one uncluttered scene, one control row.

### md — unstack the collision

- Move the icon row **below** the text instead of beside it, so the info
  block is a single left-aligned column and nothing reaches into
  Sputnik's airspace.
- Pull the block off the hard `left: 5vw` and into a `max-width` column
  with a floor on the left inset (say `max(5vw, 24px)`), so it stops
  drifting with viewport width.

### lg — mostly leave it, two fixes

- Widen the info container enough for the longest typed string, or
  shorten the strings. Truncation reads as a bug.
- Optionally lift the block ~5% to close the upper-middle gap.

### xl — cap, don't stretch

- Cap the info container (`max-width: 520px`) and stop scaling it with
  `vw + vh`; let the extra width become breathing room rather than longer
  lines.
- Anchor the whole DOM layer to a centred `max-width` container so at
  1728px it doesn't hug the left bezel.
- Consider capping the scene's zoom so the planets don't spread out into
  emptiness on very wide screens.

## Element inventory

| Element | Layer | Now | Proposed |
| --- | --- | --- | --- |
| Back to orbit | DOM | fixed top-left | unchanged |
| Wordmark | DOM (SVG) | full width, top | ~85% width on sm |
| Day/night switch | DOM | fixed top-right | bottom control cluster on sm |
| Info panel | DOM | `left:5vw`, `top:45%` | bottom sheet (sm), left column (md), capped column (lg/xl) |
| Social icons | DOM | inline beside text | below text on md and under |
| Typed intro | DOM | in panel | unchanged; widen container |
| Scroll hint | DOM | bottom centre | unchanged (already lifted above the pill on sm) |
| Audio pill | DOM | fixed bottom-left | joins the control cluster |
| Badge medallion | DOM/3D | bottom-right | hidden on sm |
| Earth / ABOUT ME | 3D | orbital | keep; give it the reserved top band on sm |
| Asteroids, Sputnik | 3D | orbital | scenery only on sm; duplicate as links in the panel |
| Rocket, drum pad | 3D | orbital | drum pad hidden on sm |

## Suggested order

1. `sm` bottom sheet + in-panel nav — biggest gain, contained change.
2. `md` icon row below text — kills the Sputnik collision outright.
3. Info container width caps for `lg`/`xl`.
4. Control cluster (audio + day/night together).
5. Hide badge medallion and drum pad on `sm`.

Steps 1 and 2 are independent; either can ship alone.

## Caveat on the stories

`Home.stories.tsx` renders the DOM layer only — the 3D-anchored targets
need a live canvas and are inert there. Use the stories to iterate on the
DOM bands above, then confirm collisions against the real app, because
only the real app shows where the 3D bodies actually are.
