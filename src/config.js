import { existsSync, mkdirSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '..');

// Load .env from project root
dotenv.config({ path: path.join(projectRoot, '.env') });

function ensureDir(dir) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  return dir;
}

const dataDir = path.resolve(process.env.DATA_DIR || path.join(projectRoot, 'data'));

export const cfg = {
  // Epic credentials (optional — interactive login also supported)
  eg_email: process.env.EG_EMAIL || '',
  eg_password: process.env.EG_PASSWORD || '',
  eg_otpkey: process.env.EG_OTPKEY || '',

  // Browser
  headless: process.env.HEADLESS !== '0',
  browserDir: ensureDir(process.env.BROWSER_DIR || path.join(dataDir, 'browser-profile')),
  width: parseInt(process.env.WIDTH || '1280', 10),
  height: parseInt(process.env.HEIGHT || '720', 10),
  timeout: parseInt(process.env.TIMEOUT || '30000', 10),
  loginTimeout: parseInt(process.env.LOGIN_TIMEOUT || '180000', 10), // 3 minutes for manual login

  // Directories
  dir: {
    data: ensureDir(dataDir),
    screenshots: ensureDir(path.join(dataDir, 'screenshots')),
    browser: ensureDir(process.env.BROWSER_DIR || path.join(dataDir, 'browser-profile')),
  },

  // Notification
  webhookUrl: process.env.WEBHOOK_URL || '',

  // Debug
  debug: process.env.DEBUG === '1',
  dryrun: process.env.DRYRUN === '1',

  // Locale
  locale: process.env.LOCALE || 'en-US',
  country: process.env.COUNTRY || 'US',
};
