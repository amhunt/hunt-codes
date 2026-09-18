import { BackLink } from "ui/BackLink";
import { WorkCardBody } from "ui/WorkCard";
import React, { useEffect, useState } from "react";
import cx from "classnames";
import { Link, useNavigate } from "react-router-dom";
import {
  AudioWaveform,
  Clapperboard,
  Cuboid,
  PenLine,
  ShoppingBag,
  Wand2,
} from "lucide-react";

import { startSynthJourney } from "./rocketJourney";
import { ensureAudio } from "./synthAudio";
import ZipVideoPopover from "./ZipVideoPopover";
import { ZIP_BLOG_POST_URL } from "./workLinks";

/**
 * /projects-and-toys: everything Andrew has made, as a grid of cards
 * over the Sputnik close-up. The camera still swoops in from /home and
 * perches over the satellite (CameraRig's projects view); the cards —
 * /about's work-card body, each filed by kind in its corner tag — dock
 * to the right of it on wide frames and scroll over it on phones
 * (`.projects-panel` in App.scss). The satellite's part links (the
 * scroll, screen, pen, vase and tile) and the 808 pad that used to BE
 * this page's links are parked in the scene (SolarScene), not gone.
 *
 * Beyond the cards: a corner Home link, and the Zip reel opens in the
 * shared popover. The synth card keeps the pad's trick: the click
 * unlocks the AudioContext and boards the 808 transit, so the beat is
 * already going when /synth lands.
 */

/** The arrival swoop lands at 2s; the cards fade up through its tail
 *  rather than waiting it out (the same beat /about's panel takes) */
const REVEAL_DELAY_MS = 1200;

const ProjectsAndToys = () => {
  const navigate = useNavigate();
  const [videoOpen, setVideoOpen] = useState(false);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setShown(true), REVEAL_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  return (
    <>
      <div className="homePageBackLink">
        <BackLink className="mt-4" />
      </div>
      <main className={cx("projects-panel", shown && "show")}>
        <header className="projects-caption">
          <h1>Projects & toys</h1>
          <p>Things I&rsquo;ve made - some for work, some for fun.</p>
        </header>
        {/* The toys built for this site first, then the shop, then the
            Zip work — fun before work here, the reverse of /about */}
        <div className="work-samples projects-grid">
          <Link className="work-card" to="/draw">
            <WorkCardBody
              tag="Toy"
              icon={<Wand2 size={20} />}
              title="SVG Studio"
              subtitle="Describe a picture and an AI draws it as an animated SVG"
            />
          </Link>
          {/* Unlocking the AudioContext inside this click is what lets
              the beat start the moment you land. The ride flips the
              route itself if it boards; if it can't (no 3D driver), the
              plain hop still lands on /synth, like /about's card. */}
          <button
            type="button"
            className="work-card"
            onClick={() => {
              ensureAudio();
              startSynthJourney();
              void navigate("/synth");
            }}
          >
            <WorkCardBody
              tag="Toy"
              icon={<AudioWaveform size={20} />}
              title="Space Synth"
              subtitle="A playable synth where the planets are the knobs"
            />
          </button>
          <Link className="work-card" to="/svg-to-3d">
            <WorkCardBody
              tag="Tool"
              icon={<Cuboid size={20} />}
              title="SVG → 3D"
              subtitle="Drop in a flat SVG, get a 3D print with one part per color"
            />
          </Link>
          <Link className="work-card" to="/artifacts">
            <WorkCardBody
              tag="Shop"
              icon={<ShoppingBag size={20} />}
              title="Artifacts by Andy"
              subtitle="3D-printed goods, made by me! Browse here, order on Etsy"
            />
          </Link>
          <button
            type="button"
            className="work-card"
            onClick={() => setVideoOpen(true)}
          >
            <WorkCardBody
              tag="Video"
              icon={<Clapperboard size={20} />}
              title="Zip brand launch video"
              subtitle="The promo reel I cut for Zip's 2023 brand redesign"
            />
          </button>
          <a
            className="work-card"
            href={ZIP_BLOG_POST_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <WorkCardBody
              external
              tag="Blog post"
              icon={<PenLine size={20} />}
              title="Rewriting our component library with Material UI"
              subtitle="A post I wrote for Zip's engineering blog, 2023"
            />
          </a>
        </div>
      </main>
      {/* `video-mode` on <body> hides the panel while the reel plays */}
      {videoOpen && <ZipVideoPopover onClose={() => setVideoOpen(false)} />}
    </>
  );
};

export default ProjectsAndToys;
