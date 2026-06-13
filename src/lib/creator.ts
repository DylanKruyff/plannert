import { nanoid } from "nanoid";

const STORAGE_KEY = "plannert:creatorId";

/**
 * Returns a stable per-browser identifier used to associate plans with the
 * person who created them, without requiring accounts. Persisted in
 * localStorage and generated on first use. Returns null during SSR.
 */
export function getCreatorId(): string | null {
  if (typeof window === "undefined") return null;

  let id = window.localStorage.getItem(STORAGE_KEY);
  if (!id) {
    id = nanoid(16);
    window.localStorage.setItem(STORAGE_KEY, id);
  }
  return id;
}
