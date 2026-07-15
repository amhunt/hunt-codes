import React, { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeftCircleIcon } from "lucide-react";

import RocketCockpit from "./RocketCockpit";
import { startSynthReturn } from "./rocketJourney";
import {
  SYNTH_KNOBS,
  SYNTH_SUN_ANCHOR_ID,
  synthKnobAnchorId,
  synthUiState,
  type SynthKnobSpec,
  type SynthParam,
} from "./synthSpec";
import {
  ensureAudio,
  getParam,
  noteOff,
  noteOn,
  setParam,
  silenceSynth,
  startArp,
  synthState,
  toggleArp,
} from "./synthAudio";

/**
 * The space synth page (/synth): DOM overlays for the synth solar
 * system. The canvases never take pointer input, so each knob planet
 * gets a fixed-position button here that SynthSystem glues to the
 * planet's projection each frame — drag one vertically (or scroll, or
 * arrow-key it) to turn the knob. Stepper planets (the wave selector)
 * are a different instrument: clicking cycles to the next option, and
 * the planet itself wears the selected waveform (SynthSystem's
 * oscilloscope texture), so they carry no value arc. The sun's overlay
 * toggles the arpeggiator, the keyboard plays notes, and "back to
 * Earth" rides the lightspeed warp home.
 */

// Piano-style key map (ableton layout), semitones up from A3
const KEY_TO_SEMITONE: Record<string, number> = {
  a: 0,
  w: 1,
  s: 2,
  e: 3,
  d: 4,
  f: 5,
  t: 6,
  g: 7,
  y: 8,
  h: 9,
  u: 10,
  j: 11,
  k: 12,
  o: 13,
  l: 14,
};
const BASE_MIDI = 57; // A3

/** Vertical drag distance for a full knob sweep, px */
const DRAG_FULL_SWEEP_PX = 140;

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

const knobDisplay = (knob: SynthKnobSpec, value: number): string =>
  knob.stepNames
    ? knob.stepNames[Math.round(value * (knob.stepNames.length - 1))]
    : `${Math.round(value * 100)}%`;

const Synth = () => {
  const [params, setParamsState] = useState<Record<SynthParam, number>>(
    () =>
      Object.fromEntries(
        SYNTH_KNOBS.map((knob) => [knob.param, getParam(knob.param)]),
      ) as Record<SynthParam, number>,
  );
  const [playing, setPlaying] = useState(synthState.playing);
  const [activeParam, setActiveParam] = useState<SynthParam | null>(null);
  const drag = useRef<{
    param: SynthParam;
    pointerId: number;
    startY: number;
    startValue: number;
  } | null>(null);

  const commitParam = useCallback((param: SynthParam, value: number) => {
    const v = clamp01(value);
    setParam(param, v);
    setParamsState((prev) => ({ ...prev, [param]: v }));
  }, []);

  // Arriving by 808 pad: the click that launched the warp already
  // unlocked the AudioContext, so the beat can greet the landing. A
  // deep-linked visit stays silent until the first click on the sun.
  useEffect(() => {
    if (synthState.ready) {
      startArp();
      setPlaying(true);
    }
    return () => {
      synthUiState.activeKnob = null;
      silenceSynth();
    };
  }, []);

  // The computer keyboard is the keybed
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.repeat || e.metaKey || e.ctrlKey || e.altKey) return;
      const semitone = KEY_TO_SEMITONE[e.key.toLowerCase()];
      if (semitone === undefined) return;
      noteOn(BASE_MIDI + semitone);
    };
    const up = (e: KeyboardEvent) => {
      const semitone = KEY_TO_SEMITONE[e.key.toLowerCase()];
      if (semitone === undefined) return;
      noteOff(BASE_MIDI + semitone);
    };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    return () => {
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
    };
  }, []);

  const setActive = useCallback((param: SynthParam | null) => {
    synthUiState.activeKnob = param;
    setActiveParam(param);
  }, []);

  // Stepper planets cycle through their options (wrapping) instead of
  // sweeping a scale
  const cycleStep = useCallback(
    (knob: SynthKnobSpec, direction: 1 | -1) => {
      const count = knob.stepNames!.length;
      const step = Math.round(getParam(knob.param) * (count - 1));
      const next = (step + direction + count) % count;
      commitParam(knob.param, next / (count - 1));
    },
    [commitParam],
  );

  return (
    <>
      <RocketCockpit />
      <div className="synthBackLink">
        <button type="button" onClick={() => startSynthReturn()}>
          <ArrowLeftCircleIcon className="starIcon" size={16} />
          <span>Back to Earth</span>
        </button>
      </div>
      {/* The sun is the power switch */}
      <button
        type="button"
        id={SYNTH_SUN_ANCHOR_ID}
        className="synth-sun-button"
        aria-label={playing ? "Pause the beat" : "Play the beat"}
        onClick={() => {
          ensureAudio();
          toggleArp();
          setPlaying(synthState.playing);
        }}
      >
        <span className="synth-sun-glyph" aria-hidden>
          {playing ? "❚❚" : "▶"}
        </span>
      </button>
      {SYNTH_KNOBS.map((knob) => {
        const value = params[knob.param];
        const isActive = activeParam === knob.param;
        if (knob.stepNames) {
          // Click-to-cycle stepper: the planet displays the selection
          // (no sliding scale), the label names it, a click advances it
          return (
            <button
              key={knob.param}
              type="button"
              id={synthKnobAnchorId(knob.param)}
              className="synth-knob synth-knob--stepper"
              aria-label={`${knob.label}: ${knobDisplay(knob, value)} — click for next`}
              onClick={() => {
                ensureAudio();
                cycleStep(knob, 1);
              }}
              onKeyDown={(e) => {
                if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                  e.preventDefault();
                  ensureAudio();
                  cycleStep(knob, 1);
                } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                  e.preventDefault();
                  ensureAudio();
                  cycleStep(knob, -1);
                }
              }}
              onPointerEnter={() => setActive(knob.param)}
              onPointerLeave={() => setActive(null)}
              onFocus={() => setActive(knob.param)}
              onBlur={() => setActive(null)}
            >
              <span className="synth-knob-label">
                {knob.label} · {knobDisplay(knob, value)}
              </span>
            </button>
          );
        }
        return (
          <button
            key={knob.param}
            type="button"
            id={synthKnobAnchorId(knob.param)}
            className="synth-knob"
            aria-label={`${knob.label}: ${knobDisplay(knob, value)}`}
            onPointerDown={(e) => {
              ensureAudio();
              (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
              drag.current = {
                param: knob.param,
                pointerId: e.pointerId,
                startY: e.clientY,
                startValue: value,
              };
              setActive(knob.param);
            }}
            onPointerMove={(e) => {
              const d = drag.current;
              if (!d || d.param !== knob.param || d.pointerId !== e.pointerId) {
                return;
              }
              commitParam(
                knob.param,
                d.startValue + (d.startY - e.clientY) / DRAG_FULL_SWEEP_PX,
              );
            }}
            onPointerUp={() => {
              drag.current = null;
            }}
            onPointerCancel={() => {
              drag.current = null;
            }}
            onPointerEnter={() => setActive(knob.param)}
            onPointerLeave={() => {
              if (!drag.current) setActive(null);
            }}
            onWheel={(e) => {
              ensureAudio();
              commitParam(knob.param, value - e.deltaY * 0.0012);
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowUp" || e.key === "ArrowRight") {
                e.preventDefault();
                ensureAudio();
                commitParam(knob.param, value + 0.05);
              } else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
                e.preventDefault();
                ensureAudio();
                commitParam(knob.param, value - 0.05);
              }
            }}
            onFocus={() => setActive(knob.param)}
            onBlur={() => {
              if (!drag.current) setActive(null);
            }}
          >
            <svg className="synth-knob-arc" viewBox="0 0 100 100" aria-hidden>
              <circle className="synth-knob-track" cx="50" cy="50" r="46" />
              <circle
                className="synth-knob-value"
                cx="50"
                cy="50"
                r="46"
                pathLength={100}
                strokeDasharray={`${value * 100} ${100 - value * 100}`}
                transform="rotate(-90 50 50)"
                style={{ stroke: knob.color }}
              />
            </svg>
            <span className="synth-knob-label">
              {knob.label}
              {isActive && ` · ${knobDisplay(knob, value)}`}
            </span>
          </button>
        );
      })}
      <div className="synth-hint">
        drag a planet to shape the sound · A–K plays notes · the sun runs the
        beat
      </div>
    </>
  );
};

export default Synth;
