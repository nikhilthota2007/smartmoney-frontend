/**
 * Export and import the profile as a JSON file.
 *
 * There are no accounts yet, so this is how someone moves their data to another
 * browser or keeps a copy of it.
 */
import { migrateProfile } from './profile';

export const EXPORT_FILENAME = 'smartmoney-profile.json';

export const serializeProfile = (profile) => JSON.stringify(profile, null, 2);

/**
 * Parse an exported file back into a profile.
 * Throws with a message suitable for showing the user.
 */
export const parseProfileFile = (text) => {
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("That file isn't valid JSON.");
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error("That file doesn't look like a SmartMoney profile.");
  }
  // migrateProfile accepts v1 and partial v2 records, so an older export still loads.
  return migrateProfile(parsed);
};

/**
 * Read a File as text.
 *
 * FileReader rather than File.text(): it is supported everywhere the app runs,
 * including older Safari, and unlike File.text() it exists in jsdom, so the
 * import path is testable.
 */
export const readFileAsText = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("That file couldn't be read."));
    reader.readAsText(file);
  });

/** Trigger a download of the profile. No-ops where the DOM APIs are unavailable. */
export const downloadProfile = (profile, filename = EXPORT_FILENAME) => {
  const blob = new Blob([serializeProfile(profile)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};
