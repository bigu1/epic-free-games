#!/usr/bin/env node

/**
 * epic-free-games — Automatically claim free games from the Epic Games Store.
 *
 * Usage:
 *   node src/index.js --list       List current & upcoming free games
 *   node src/index.js --login      Interactive login (opens browser)
 *   node src/index.js --claim      Claim all free games (default)
 *   node src/index.js --help       Show help
 */

import { cfg } from './config.js';
import { fetchFreeGames } from './epic-api.js';
import { launchBrowser, isLoggedIn, login, claimFreeGames } from './claimer.js';
import { notify, notifyClaimResults } from './notifier.js';
import { datetime, jsonDb, formatGameList } from './utils.js';
import path from 'path';

const args = process.argv.slice(2);
const command = args.find((a) => a.startsWith('--'))?.replace('--', '') || 'claim';

async function main() {
  console.log(`[${datetime()}] epic-free-games v0.1.0`);

  switch (command) {
    case 'list':
      await cmdList();
      break;
    case 'login':
      await cmdLogin();
      break;
    case 'claim':
      await cmdClaim();
      break;
    case 'help':
    case 'h':
      showHelp();
      break;
    default:
      console.error(`Unknown command: --${command}`);
      showHelp();
      process.exit(1);
  }
}

/**
 * --list: Query and display current/upcoming free games (no auth needed).
 */
async function cmdList() {
  console.log('Fetching free games from Epic Games Store...\n');
  const { current, upcoming } = await fetchFreeGames({
    locale: cfg.locale,
    country: cfg.country,
  });

  console.log('🎮 Current Free Games:');
  console.log(formatGameList(current) || '  (none)');
  console.log('');
  console.log('🔜 Upcoming Free Games:');
  console.log(formatGameList(upcoming) || '  (none)');

  // Output JSON for programmatic use
  if (args.includes('--json')) {
    console.log('\n--- JSON ---');
    console.log(JSON.stringify({ current, upcoming }, null, 2));
  }
}

/**
 * --login: Open browser for interactive login.
 */
async function cmdLogin() {
  const { context, page } = await launchBrowser({ headless: false });
  try {
    const user = await login(page);
    console.log(`\nLogin successful! Session saved for: ${user}`);
    console.log('You can now run: node src/index.js --claim');
  } finally {
    await context.close();
  }
}

/**
 * --claim: Check for free games and claim them.
 */
async function cmdClaim() {
  // First, check what's available via public API
  console.log('Checking available free games...');
  let freeGames;
  try {
    const { current } = await fetchFreeGames({ locale: cfg.locale, country: cfg.country });
    freeGames = current;
    console.log(
      `Found ${current.length} free game(s): ${current.map((g) => g.title).join(', ') || '(none)'}`
    );
    if (!current.length) {
      await notify('No free games available on Epic Games Store this week.', { level: 'info' });
      return;
    }
  } catch (err) {
    console.error(`Failed to fetch free games list: ${err.message}`);
    console.log('Will try to detect free games via browser instead.');
  }

  // Launch browser and check login status
  const { context, page } = await launchBrowser();
  try {
    const loggedIn = await isLoggedIn(page);
    if (!loggedIn) {
      console.log('Not logged in. Attempting login...');
      if (cfg.eg_email && cfg.eg_password) {
        await login(page);
      } else {
        await notify(
          'Epic Games session expired. Please run: node src/index.js --login',
          { level: 'warning' }
        );
        console.error(
          '\n❌ Not logged in and no credentials configured.\n' +
            'Run with --login first, or set EG_EMAIL and EG_PASSWORD in .env'
        );
        return;
      }
    }

    // Claim games
    const results = await claimFreeGames(page);

    // Save results to claimed.json
    const db = jsonDb(path.join(cfg.dir.data, 'claimed.json'), { history: [] });
    db.data.history.push({
      date: datetime(),
      results,
    });
    db.save();

    // Send notification
    await notifyClaimResults(results);
  } finally {
    await context.close();
  }
}

function showHelp() {
  console.log(`
epic-free-games — Auto-claim free games from Epic Games Store

Usage:
  node src/index.js [command]

Commands:
  --list     List current & upcoming free games (no login required)
  --login    Interactive login (opens visible browser window)
  --claim    Claim all available free games (default)
  --help     Show this help

Options:
  --json     Output JSON (with --list)

Environment Variables:
  EG_EMAIL       Epic Games account email
  EG_PASSWORD    Epic Games account password
  EG_OTPKEY      TOTP secret for 2FA
  HEADLESS       Set to 0 to show browser (default: 1)
  DRYRUN         Set to 1 to skip actual purchases
  WEBHOOK_URL    Webhook URL for notifications
  DATA_DIR       Custom data directory (default: ./data)

Examples:
  node src/index.js --list           # Check what's free this week
  node src/index.js --login          # Login to Epic Games
  node src/index.js --claim          # Claim all free games
  DRYRUN=1 node src/index.js        # Test run without claiming
  `);
}

main().catch((err) => {
  console.error(`Fatal error: ${err.message}`);
  if (cfg.debug) console.error(err.stack);
  process.exit(1);
});
