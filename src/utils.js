import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import path from 'path';

/**
 * Get current datetime string in ISO format
 */
export function datetime() {
  return new Date().toISOString().replace('T', ' ').replace(/\.\d+Z$/, 'Z');
}

/**
 * Simple JSON file database
 * @param {string} filepath - Path to JSON file
 * @param {object} defaults - Default data if file doesn't exist
 * @returns {{ data: object, save: () => void }}
 */
export function jsonDb(filepath, defaults = {}) {
  const dir = path.dirname(filepath);
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });

  let data;
  try {
    data = JSON.parse(readFileSync(filepath, 'utf-8'));
  } catch {
    data = structuredClone(defaults);
  }

  return {
    data,
    save() {
      writeFileSync(filepath, JSON.stringify(data, null, 2), 'utf-8');
    },
  };
}

/**
 * Make a filename-safe string
 */
export function filenamify(str) {
  return str.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_').replace(/\s+/g, '_');
}

/**
 * Sleep for ms milliseconds
 */
export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Format game list for display
 */
export function formatGameList(games) {
  if (!games.length) return 'No free games available.';
  return games
    .map(
      (g, i) =>
        `${i + 1}. ${g.title}${g.startDate && g.endDate ? ` (${g.startDate.slice(0, 10)} ~ ${g.endDate.slice(0, 10)})` : ''}`
    )
    .join('\n');
}
