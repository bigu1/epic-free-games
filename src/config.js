import { existsSync, mkdirSync, readFileSync } from 'fs';
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

/**
 * Load accounts from config file or environment variables.
 * Config file (data/config.json) takes priority.
 *
 * Config file format:
 * {
 *   "accounts": [
 *     { "email": "user1@example.com", "password": "xxx", "otpkey": "" },
 *     { "email": "user2@example.com", "password": "yyy", "otpkey": "TOTP_SECRET" }
 *   ]
 * }
 *
 * If no config file, falls back to EG_EMAIL / EG_PASSWORD / EG_OTPKEY env vars (single account).
 */
function loadAccounts() {
  const configPath = path.join(dataDir, 'config.json');
  if (existsSync(configPath)) {
    try {
      const raw = readFileSync(configPath, 'utf-8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.accounts) && parsed.accounts.length > 0) {
        return parsed.accounts.map((a) => ({
          email: a.email || '',
          password: a.password || '',
          otpkey: a.otpkey || '',
        }));
      }
    } catch (err) {
      console.error(`Warning: failed to parse ${configPath}: ${err.message}`);
    }
  }

  // Fallback: single account from env
  const email = process.env.EG_EMAIL || '';
  if (email) {
    return [
      {
        email,
        password: process.env.EG_PASSWORD || '',
        otpkey: process.env.EG_OTPKEY || '',
      },
    ];
  }

  // No accounts configured — interactive login mode
  return [];
}

const accounts = loadAccounts();

export const cfg = {
  // Accounts (multi-account support)
  accounts,

  // Legacy single-account shortcuts (first account or empty)
  eg_email: accounts[0]?.email || '',
  eg_password: accounts[0]?.password || '',
  eg_otpkey: accounts[0]?.otpkey || '',

  // Browser
  headless: process.env.HEADLESS !== '0',
  browserDir: ensureDir(process.env.BROWSER_DIR || path.join(dataDir, 'browser-profile')),
  width: parseInt(process.env.WIDTH || '1280', 10),
  height: parseInt(process.env.HEIGHT || '720', 10),
  timeout: parseInt(process.env.TIMEOUT || '30000', 10),
  loginTimeout: parseInt(process.env.LOGIN_TIMEOUT || '180000', 10), // 3 minutes for manual login

  // Parental control PIN (if enabled on Epic account)
  eg_parentalpin: process.env.EG_PARENTALPIN || '',

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

  /**
   * Get browser profile directory for a specific account.
   * For multi-account, each account gets its own profile subdirectory.
   */
  getBrowserDir(accountIndex = 0) {
    if (accounts.length <= 1) return this.dir.browser;
    const suffix = accounts[accountIndex]?.email?.replace(/[^a-zA-Z0-9]/g, '_') || `account_${accountIndex}`;
    return ensureDir(path.join(dataDir, 'browser-profiles', suffix));
  },
};
