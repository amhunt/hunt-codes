import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Sun } from "react-feather";
import { Box, Download, RotateCcw, Upload } from "lucide-react";
import {
  analyzeSvg,
  DEFAULT_PART_OPTIONS,
  exportToThreeMf,
  processAnalysis,
  type ColorMesh,
  type GroupingMode,
  type PartOptions,
  type SvgAnalysis,
} from "svg-to-3d";

import Preview3D from "./Preview3D";

const GROUPINGS: { mode: GroupingMode; label: string; hint: string }[] = [
  {
    mode: "parts",
    label: "One object",
    hint: "every color is a part of a single object — the slicer sees one model to assign filaments to",
  },
  {
    mode: "objects",
    label: "Separate objects",
    hint: "every color is its own object on the plate — print them apart and glue them up",
  },
];

/** "rocket-badge.svg" → "rocket-badge" */
const baseName = (fileName: string) => fileName.replace(/\.svg$/i, "");

const SvgTo3d = () => {
  const [svgText, setSvgText] = useState<string | null>(null);
  const [fileName, setFileName] = useState("");
  const [mode, setMode] = useState<GroupingMode>("parts");
  const [scale, setScale] = useState(0.5);
  const [optionsByColor, setOptionsByColor] = useState<
    Map<string, PartOptions>
  >(() => new Map());
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);
  // Bumped by "reset view"; Preview3D re-frames the camera on every change
  const [resetToken, setResetToken] = useState(0);

  const noun = mode === "parts" ? "part" : "object";

  // A parse failure is part of the memo's result rather than a setError from
  // inside it — setting state during render is how the original standalone
  // app did it, and under StrictMode it fires twice and fights the retry
  const { analysis, parseError } = useMemo<{
    analysis: SvgAnalysis | null;
    parseError: string | null;
  }>(() => {
    if (!svgText) return { analysis: null, parseError: null };
    try {
      return { analysis: analyzeSvg(svgText), parseError: null };
    } catch (error_) {
      return { analysis: null, parseError: (error_ as Error).message };
    }
  }, [svgText]);

  // Keep an options entry for every detected color, preserving prior edits.
  useEffect(() => {
    if (!analysis) return;
    setOptionsByColor((previous) => {
      const next = new Map<string, PartOptions>();
      for (const color of analysis.colors) {
        next.set(color, previous.get(color) ?? { ...DEFAULT_PART_OPTIONS });
      }
      return next;
    });
  }, [analysis]);

  const { meshes, buildError } = useMemo<{
    meshes: ColorMesh[];
    buildError: string | null;
  }>(() => {
    if (!analysis) return { meshes: [], buildError: null };
    try {
      return {
        meshes: processAnalysis(analysis, scale, optionsByColor),
        buildError: null,
      };
    } catch (error_) {
      return { meshes: [], buildError: (error_ as Error).message };
    }
  }, [analysis, scale, optionsByColor]);

  const updateOption = (color: string, patch: Partial<PartOptions>) => {
    setOptionsByColor((previous) => {
      const next = new Map(previous);
      next.set(color, {
        ...(previous.get(color) ?? DEFAULT_PART_OPTIONS),
        ...patch,
      });
      return next;
    });
  };

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    if (
      !file.name.toLowerCase().endsWith(".svg") &&
      file.type !== "image/svg+xml"
    ) {
      setError("That one isn't an SVG — try a .svg file");
      return;
    }
    const text = await file.text();
    setFileName(baseName(file.name));
    setSvgText(text);
  }, []);

  const onInputChange: React.ChangeEventHandler<HTMLInputElement> = (event) => {
    const file = event.target.files?.[0];
    if (file) void handleFile(file);
  };

  const onDrop: React.DragEventHandler<HTMLDivElement> = (event) => {
    event.preventDefault();
    setDragging(false);
    const file = event.dataTransfer.files?.[0];
    if (file) void handleFile(file);
  };

  // The uploaded artwork is rendered through an <img>, never inlined as
  // markup — same rule the drawing studio follows. Nothing on this page
  // needs the SVG's internals to be live, and a file off a stranger's disk
  // is exactly the thing that shouldn't get to run script in the page.
  const [svgSrc, setSvgSrc] = useState("");
  useEffect(() => {
    if (!svgText) {
      setSvgSrc("");
      return;
    }
    const url = URL.createObjectURL(
      new Blob([svgText], { type: "image/svg+xml" }),
    );
    setSvgSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [svgText]);

  const onDownload = async () => {
    if (meshes.length === 0) return;
    setBusy(true);
    try {
      const blob = await exportToThreeMf(meshes, mode);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileName || "model"}.3mf`;
      document.body.append(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error_) {
      setError((error_ as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const shownError = error ?? parseError ?? buildError;

  return (
    <div className="svg3d-page">
      <div className="svg3d-back-link">
        <Link
          className="mt-4 flex items-center gap-1 transition-transform"
          to="/home"
        >
          <Sun aria-hidden="true" className="starIcon" size={16} />
          <span>Home</span>
        </Link>
      </div>

      <div className="svg3d-container">
        <h1 className="svg3d-title">SVG &rarr; 3D</h1>
        <p className="svg3d-subtitle">
          Drop in a flat SVG and it comes back out as a solid — every fill color
          extruded into its own part, packed up as a .3mf your slicer already
          speaks.
        </p>

        {/* Drop target — the whole panel is the file input */}
        <div
          className={`svg3d-dropzone ${dragging ? "is-dragging" : ""} ${svgText ? "has-file" : ""}`}
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            accept=".svg,image/svg+xml"
            id="svg3d-file"
            onChange={onInputChange}
            type="file"
          />
          <label htmlFor="svg3d-file">
            <Upload aria-hidden="true" size={18} />
            <span>
              {svgText
                ? `${fileName}.svg`
                : "Click, or drag and drop to upload an SVG"}
            </span>
          </label>
        </div>

        {shownError && (
          <p className="svg3d-error" role="alert">
            {shownError}
          </p>
        )}

        {svgSrc && (
          <div className="svg3d-flat-preview">
            <img alt={`${fileName}.svg`} src={svgSrc} />
          </div>
        )}

        {meshes.length > 0 && (
          <section className="svg3d-section">
            <div className="svg3d-section-head">
              <h2 className="svg3d-section-title">3D preview</h2>
              <button
                className="svg3d-ghost"
                onClick={() => setResetToken((token) => token + 1)}
                type="button"
              >
                <RotateCcw aria-hidden="true" size={13} />
                reset view
              </button>
            </div>
            <Preview3D meshes={meshes} resetToken={resetToken} />
            <p className="svg3d-hint">
              Drag to orbit · Right-drag to pan · Scroll to zoom
            </p>
          </section>
        )}

        {svgText && (
          <section className="svg3d-section">
            <h2 className="svg3d-section-title">settings</h2>
            <div className="svg3d-panel">
              <div className="svg3d-row">
                <span className="svg3d-row-label">grouping</span>
                <div className="svg3d-seg" role="group" aria-label="Grouping">
                  {GROUPINGS.map((grouping) => (
                    <button
                      aria-pressed={mode === grouping.mode}
                      className="svg3d-seg-option"
                      key={grouping.mode}
                      onClick={() => setMode(grouping.mode)}
                      title={grouping.hint}
                      type="button"
                    >
                      {grouping.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="svg3d-row">
                <label className="svg3d-row-label" htmlFor="svg3d-scale">
                  scale (mm per SVG unit)
                </label>
                <input
                  className="svg3d-number"
                  id="svg3d-scale"
                  min={0.01}
                  onChange={(event) =>
                    setScale(Number(event.target.value) || 0)
                  }
                  step={0.05}
                  type="number"
                  value={scale}
                />
              </div>
            </div>
          </section>
        )}

        {analysis && (
          <section className="svg3d-section">
            <h2 className="svg3d-section-title">
              {analysis.colors.length} {noun}
              {analysis.colors.length === 1 ? "" : "s"} · depth &amp; bevel per{" "}
              {noun}
            </h2>
            {meshes.length === 0 ? (
              <p className="svg3d-empty">
                Nothing fillable in there — this needs filled paths, not
                strokes.
              </p>
            ) : (
              <ul className="svg3d-parts">
                {meshes.map((mesh) => {
                  const options =
                    optionsByColor.get(mesh.color) ?? DEFAULT_PART_OPTIONS;
                  return (
                    <li className="svg3d-part" key={mesh.color}>
                      <div className="svg3d-part-head">
                        <span
                          className="svg3d-chip"
                          style={{ background: mesh.color }}
                        />
                        <code>{mesh.color}</code>
                        <span className="svg3d-muted">
                          {mesh.vertices.length / 3} verts ·{" "}
                          {mesh.triangles.length / 3} tris
                        </span>
                        <span
                          className={
                            mesh.nonManifoldEdges === 0
                              ? "svg3d-tag is-ok"
                              : "svg3d-tag is-warn"
                          }
                        >
                          {mesh.nonManifoldEdges === 0
                            ? "watertight"
                            : `${mesh.nonManifoldEdges} bad edge${
                                mesh.nonManifoldEdges === 1 ? "" : "s"
                              }`}
                        </span>
                      </div>

                      <div className="svg3d-part-controls">
                        <label className="svg3d-field">
                          <span>depth (mm)</span>
                          <input
                            className="svg3d-number"
                            min={0.1}
                            onChange={(event) =>
                              updateOption(mesh.color, {
                                extrudeDepth: Number(event.target.value) || 0,
                              })
                            }
                            step={0.1}
                            type="number"
                            value={options.extrudeDepth}
                          />
                        </label>

                        <label className="svg3d-check">
                          <input
                            checked={options.bevelTop}
                            onChange={(event) =>
                              updateOption(mesh.color, {
                                bevelTop: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          <span>bevel top</span>
                        </label>

                        <label className="svg3d-check">
                          <input
                            checked={options.bevelBottom}
                            onChange={(event) =>
                              updateOption(mesh.color, {
                                bevelBottom: event.target.checked,
                              })
                            }
                            type="checkbox"
                          />
                          <span>bevel bottom</span>
                        </label>

                        {(options.bevelTop || options.bevelBottom) && (
                          <>
                            <label className="svg3d-field">
                              <span>bevel size (mm)</span>
                              <input
                                className="svg3d-number"
                                min={0.05}
                                onChange={(event) =>
                                  updateOption(mesh.color, {
                                    bevelSize: Number(event.target.value) || 0,
                                  })
                                }
                                step={0.05}
                                type="number"
                                value={options.bevelSize}
                              />
                            </label>
                            <label className="svg3d-field">
                              <span>bevel height (mm)</span>
                              <input
                                className="svg3d-number"
                                min={0.05}
                                onChange={(event) =>
                                  updateOption(mesh.color, {
                                    bevelThickness:
                                      Number(event.target.value) || 0,
                                  })
                                }
                                step={0.05}
                                type="number"
                                value={options.bevelThickness}
                              />
                            </label>
                          </>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        )}

        <button
          className="svg3d-button"
          disabled={meshes.length === 0 || busy}
          onClick={() => void onDownload()}
          type="button"
        >
          {busy ? (
            <span aria-hidden="true" className="svg-generator-spinner" />
          ) : (
            <Download aria-hidden="true" size={18} />
          )}
          <span>{busy ? "packing…" : "download .3mf"}</span>
        </button>

        {!svgText && (
          <p className="svg3d-footnote">
            <Box aria-hidden="true" size={13} />
            Everything happens in the browser — the file never leaves this tab.
          </p>
        )}
      </div>
    </div>
  );
};

export default SvgTo3d;
