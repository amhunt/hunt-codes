/**
 * Screen-space pan accumulated from the solar camera's rotation, in CSS
 * pixels. Written by CameraRig each frame (the per-frame rotation delta
 * projected to screen axes); read by the star field, which shifts and
 * wraps the background stars by it — so the distant starscape rotates
 * with the camera (the home view co-rotates with Earth's orbit, the
 * about view rides the moon's) instead of being painted on.
 *
 * Axes follow the star canvas's world axes: +x right, +y up. The value
 * grows without bound as the camera keeps orbiting; the star shader
 * wraps positions around the padded viewport, so only the fractional
 * part matters.
 */
export const starPanState = { x: 0, y: 0 };
