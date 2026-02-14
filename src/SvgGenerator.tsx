import React, { useState, useRef, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { ChevronDown, Star } from "react-feather";
import { Wand2 } from "lucide-react";

const SYSTEM_PROMPT = `You are an SVG artist. Create a beautiful, clean SVG illustration based on the user's description.

Rules:
- Return ONLY valid SVG markup, no explanation, no markdown code fences, no other text
- Use viewBox="0 0 400 400"
- Prefer <path> elements with explicit stroke attributes for optimal drawing animation
- Use vibrant, appealing colors that look good on a dark (#000) background
- Keep the design clean, minimal, and recognizable
- Set stroke-width between 2-4px
- Include both stroke and fill on path elements where appropriate
- Make the illustration detailed enough to be interesting but not overly complex
- Do NOT use <text> elements`;

const DRAWABLE_SELECTORS =
  "path, circle, ellipse, line, polyline, polygon, rect";

/** Number of pre-generated wave keyframe variants (elements are randomly assigned one). */
const NUM_WAVE_VARIANTS = 14;

/**
 * Builds the CSS text for all wave + entrance keyframes.
 * Wave variants are generated once with random amplitudes so each
 * element can reference a different one for visual variety.
 */
const buildAnimationCSS = () => {
  let css = `
    @keyframes svg-entrance {
      from { opacity: 0; transform: translateY(10px) scale(0.92); }
      to   { opacity: 1; transform: translateY(0)   scale(1); }
    }
  `;

  for (let v = 0; v < NUM_WAVE_VARIANTS; v++) {
    // Random amplitudes for each variant
    const ax = (Math.random() - 0.5) * 12;
    const ay = (Math.random() - 0.5) * 16;
    const rot = (Math.random() - 0.5) * 6;
    const s1 = 0.97 + Math.random() * 0.06;
    const s2 = 0.96 + Math.random() * 0.08;

    css += `
      @keyframes svg-wave-${v} {
        0%, 100% {
          transform: translate(0px, 0px) rotate(0deg) scale(1);
        }
        20% {
          transform: translate(${ax.toFixed(1)}px, ${ay.toFixed(1)}px) rotate(${rot.toFixed(1)}deg) scale(${s1.toFixed(3)});
        }
        40% {
          transform: translate(${(-ax * 0.8).toFixed(1)}px, ${(ay * 0.4).toFixed(1)}px) rotate(${(-rot * 0.7).toFixed(1)}deg) scale(${s2.toFixed(3)});
        }
        60% {
          transform: translate(${(-ax * 0.3).toFixed(1)}px, ${(-ay * 0.9).toFixed(1)}px) rotate(${(rot * 0.5).toFixed(1)}deg) scale(${(2 - s1).toFixed(3)});
        }
        80% {
          transform: translate(${(ax * 0.6).toFixed(1)}px, ${(-ay * 0.2).toFixed(1)}px) rotate(${(-rot * 0.3).toFixed(1)}deg) scale(1);
        }
      }
    `;
  }

  return css;
};

/**
 * Animates all SVG geometry elements with:
 * - A staggered entrance (fade + rise)
 * - Continuous wavy motion (random variant, duration, and phase per element)
 * Color cycling is handled via CSS on the wrapper (see App.scss).
 */
const animateSvg = (container: HTMLDivElement) => {
  const svgEl = container.querySelector("svg");
  if (!svgEl) return;

  // Ensure SVG fills its container nicely
  svgEl.setAttribute("width", "100%");
  svgEl.setAttribute("height", "100%");
  svgEl.style.maxWidth = "400px";
  svgEl.style.maxHeight = "400px";
  svgEl.style.overflow = "visible";

  const elements = svgEl.querySelectorAll(DRAWABLE_SELECTORS);
  if (!elements.length) return;

  // Inject keyframes into the SVG
  const styleEl = document.createElementNS(
    "http://www.w3.org/2000/svg",
    "style",
  );
  styleEl.textContent = buildAnimationCSS();
  svgEl.insertBefore(styleEl, svgEl.firstChild);

  // Apply per-element animations
  elements.forEach((el, i) => {
    const element = el as SVGElement;

    const variant = Math.floor(Math.random() * NUM_WAVE_VARIANTS);
    const waveDuration = 5 + Math.random() * 9; // 5 – 14 s
    const waveDelay = -(Math.random() * waveDuration); // random phase start
    const entranceDelay = Math.min(i * 0.045, 2.5); // stagger, capped at 2.5 s

    element.style.opacity = "0";
    element.style.transformOrigin = "center center";
    element.style.transformBox = "fill-box";
    element.style.willChange = "transform, opacity";
    element.style.animation = [
      `svg-entrance 0.7s ease ${entranceDelay.toFixed(2)}s forwards`,
      `svg-wave-${variant} ${waveDuration.toFixed(1)}s ease-in-out ${waveDelay.toFixed(1)}s infinite`,
    ].join(", ");
  });
};

const SvgGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [apiKey, setApiKey] = useState(
    () => localStorage.getItem("openai-api-key") || "",
  );
  const [svgContent, setSvgContent] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showApiKeyField, setShowApiKeyField] = useState(
    () => !localStorage.getItem("openai-api-key"),
  );

  const svgContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Persist API key
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem("openai-api-key", apiKey);
    }
  }, [apiKey]);

  // Focus input on mount
  useEffect(() => {
    setTimeout(() => inputRef.current?.focus(), 500);
  }, []);

  const generateSvg = useCallback(async () => {
    const trimmedPrompt = prompt.trim();
    if (!trimmedPrompt) return;

    if (!apiKey.trim()) {
      setError("Please enter your OpenAI API key");
      setShowApiKeyField(true);
      return;
    }

    setLoading(true);
    setError("");
    setSvgContent("");

    try {
      const response = await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model: "gpt-4o",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              { role: "user", content: trimmedPrompt },
            ],
            max_tokens: 4096,
            temperature: 0.8,
          }),
        },
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error?.message || `API error: ${response.status}`,
        );
      }

      const data = await response.json();
      let svg = data.choices[0]?.message?.content?.trim() || "";

      // Strip markdown code fences if the model wrapped them
      svg = svg
        .replace(/^```(?:svg|xml|html)?\n?/i, "")
        .replace(/\n?```$/i, "")
        .trim();

      if (!svg.startsWith("<svg")) {
        throw new Error("The model did not return valid SVG markup");
      }

      setSvgContent(svg);
    } catch (err: any) {
      setError(err.message || "Failed to generate SVG");
    } finally {
      setLoading(false);
    }
  }, [prompt, apiKey]);

  // Animate the SVG once it appears in the DOM
  useEffect(() => {
    if (!svgContent || !svgContainerRef.current) return;
    // Allow a tick for the DOM to render the SVG
    const raf = requestAnimationFrame(() => {
      animateSvg(svgContainerRef.current!);
    });
    return () => cancelAnimationFrame(raf);
  }, [svgContent]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !loading) {
      generateSvg();
    }
  };

  return (
    <div className="svg-generator-page">
      <div className="svg-generator-back-link">
        <Link
          className="flex transition-transform items-center gap-1 mt-4"
          to="/"
        >
          <Star className="starIcon" size={16} />
        </Link>
      </div>

      <div className="svg-generator-container">
        <h1 className="svg-generator-title">SVG Studio</h1>
        <p className="svg-generator-subtitle">
          Describe something and watch it come to life as an animated vector
          image
        </p>

        {/* API Key Field */}
        <div className="svg-generator-api-key-section">
          <button
            className="svg-generator-api-key-toggle"
            onClick={() => setShowApiKeyField(!showApiKeyField)}
            type="button"
          >
            {apiKey ? "API key saved" : "Set OpenAI API key"}
            <span
              className="svg-generator-chevron"
              style={{
                transform: showApiKeyField ? "rotate(180deg)" : "rotate(0deg)",
              }}
            >
              <ChevronDown size={12} />
            </span>
          </button>
          {showApiKeyField && (
            <input
              type="password"
              className="svg-generator-api-key-input"
              placeholder="sk-..."
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              spellCheck={false}
              autoComplete="off"
            />
          )}
        </div>

        {/* Prompt Input */}
        <div className="svg-generator-input-row">
          <input
            ref={inputRef}
            className="svg-generator-input"
            type="text"
            placeholder='Describe an image to draw, e.g. "saturn with rings"'
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading}
            spellCheck={false}
          />
          <button
            className="svg-generator-button"
            onClick={generateSvg}
            disabled={loading || !prompt.trim()}
            type="button"
          >
            {loading ? (
              <span className="svg-generator-spinner" />
            ) : (
              <Wand2 size={20} />
            )}
          </button>
        </div>

        {/* Error */}
        {error && <p className="svg-generator-error">{error}</p>}

        {/* Result */}
        <div
          className={`svg-generator-result ${svgContent ? "has-content" : ""} ${loading ? "is-loading" : ""}`}
        >
          {loading && (
            <div className="svg-generator-loading">
              <div className="svg-generator-loading-dots">
                <span />
                <span />
                <span />
              </div>
              <p>Generating your SVG...</p>
            </div>
          )}
          {svgContent && (
            <div
              ref={svgContainerRef}
              className="svg-generator-svg-wrapper"
              dangerouslySetInnerHTML={{ __html: svgContent }}
            />
          )}
        </div>
      </div>
    </div>
  );
};

export default SvgGenerator;
