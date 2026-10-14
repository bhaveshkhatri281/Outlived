/**
 * localStorage that never throws: private mode, blocked storage and SSR all
 * fall back to "nothing stored".
 */
export const safeStorage = {
  getItem(key: string): string | null {
    try {
      return window.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      window.localStorage.setItem(key, value);
    } catch {
      /* storage unavailable: ignore */
    }
  },
  removeItem(key: string) {
    try {
      window.localStorage.removeItem(key);
    } catch {
      /* storage unavailable: ignore */
    }
  },
};
