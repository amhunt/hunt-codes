/**
 * Which phrase the landing title's stars are spelling right now,
 * published by the star field (StarField's LandingTextStars) for DOM
 * chrome that wants to react to it — the "(and Claude)" caption under
 * "BUILT WITH ♥". Plain module with listeners rather than React state:
 * the phrase lives inside the WebGL canvas tree, and the caption sits
 * outside it. "" when the landing title isn't up.
 */
type Listener = (phrase: string) => void;

export const landingPhraseState = { phrase: "" };
const listeners = new Set<Listener>();

export function setLandingPhrase(phrase: string): void {
  if (landingPhraseState.phrase === phrase) return;
  landingPhraseState.phrase = phrase;
  listeners.forEach((listener) => listener(phrase));
}

/** Subscribe; the callback also fires once with the current phrase.
 *  Returns the unsubscribe. */
export function onLandingPhrase(listener: Listener): () => void {
  listeners.add(listener);
  listener(landingPhraseState.phrase);
  return () => {
    listeners.delete(listener);
  };
}
