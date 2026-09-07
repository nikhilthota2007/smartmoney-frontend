/**
 * localStorage persistence.
 *
 * Everything is best-effort: private browsing, disabled site data and quota
 * errors must never break the app, so every access is guarded.
 */
import { migrateProfile } from './profile';

export const PROFILE_KEY = 'smartmoney.profile';
export const DARK_MODE_KEY = 'darkMode'; // pre-existing key; kept so preferences survive

const read = (key) => {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key, value) => {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
};

/** Load and migrate the stored profile. Returns null when nothing is saved. */
export const loadProfile = () => {
  const raw = read(PROFILE_KEY);
  if (!raw) return null;
  try {
    return migrateProfile(JSON.parse(raw));
  } catch {
    // Corrupt record: start clean rather than crashing on boot.
    return null;
  }
};

export const saveProfile = (profile) => write(PROFILE_KEY, JSON.stringify(profile));

export const clearProfile = () => {
  try {
    window.localStorage.removeItem(PROFILE_KEY);
  } catch {
    /* nothing to do */
  }
};

export const loadDarkMode = () => read(DARK_MODE_KEY) === 'true';
export const saveDarkMode = (enabled) => write(DARK_MODE_KEY, String(enabled));
