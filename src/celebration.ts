import type { confetti } from "@tsparticles/confetti";
import type { ribbons } from "@tsparticles/ribbons";

/**
 * One loader for the site's tsParticles celebrations — confetti (the
 * corner coin's volley, /about's easter-egg rain) and ribbons (/about).
 *
 * Both plugin sets register together, up front, whichever effect asks
 * first: the shared engine throws ("Register plugins can only be done
 * before calling tsParticles.load()") once anything has loaded, so a
 * feature that inited confetti alone would lock ribbons out for the rest
 * of the session. Always go through here rather than importing
 * `@tsparticles/confetti` directly. Lazy so three chunks of particle
 * engine stay off every page's critical path.
 */
type Celebration = {
  confetti: typeof confetti;
  ribbons: typeof ribbons;
};

let loader: Promise<Celebration> | null = null;

export const loadCelebration = (): Promise<Celebration> => {
  loader ??= Promise.all([
    import("@tsparticles/confetti"),
    import("@tsparticles/ribbons"),
  ])
    .then(async ([{ confetti }, { ribbons }]) => {
      await Promise.all([confetti.init(), ribbons.init()]);
      return { confetti, ribbons };
    })
    .catch((error: unknown) => {
      // A failed chunk load shouldn't poison every later click
      loader = null;
      throw error;
    });
  return loader;
};
