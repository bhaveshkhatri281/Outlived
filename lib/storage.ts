/**
 * Web Storage that never throws: private mode, blocked storage and SSR all
 * fall back to "nothing stored".
 */
function safe(pick: () => Storage) {
  return {
    getItem(key: string): string | null {
      try {
        return pick().getItem(key);
      } catch {
        return null;
      }
    },
    setItem(key: string, value: string) {
      try {
        pick().setItem(key, value);
      } catch {
        /* storage unavailable: ignore */
      }
    },
    removeItem(key: string) {
      try {
        pick().removeItem(key);
      } catch {
        /* storage unavailable: ignore */
      }
    },
  };
}

/** Persists across visits (bag, hints, waitlist). */
export const safeStorage = safe(() => window.localStorage);

/** Lives for this tab's session only (entry gate). */
export const safeSession = safe(() => window.sessionStorage);
