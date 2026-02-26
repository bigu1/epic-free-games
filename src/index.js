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
import { launchBrowser, isLoggedIn, getLoginUser, login, claimFreeGames } from './claimer.js';
import { notify, notifyClaimResults } from './notifier.js';
import { datetime, jsonDb, formatGameList } from './utils.js';
import path from 'path';
import { existsSync } from 'fs';

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
    case 'status':
      await cmdStatus();
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

/**
 * --status: Check login status and claim history.
 */
async function cmdStatus() {
  console.log('📊 Epic Free Games — Status\n');

  // Check browser profile existence
  const profileExists = existsSync(cfg.dir.browser);
  console.log(`Browser profile: ${profileExists ? '✅ exists' : '❌ not found'} (${cfg.dir.browser})`);

  // Check login
  if (profileExists) {
    const { context, page } = await launchBrowser();
    try {
      const loggedIn = await isLoggedIn(page);
      if (loggedIn) {
        const user = await getLoginUser(page);
        console.log(`Login status:   ✅ logged in as "${user || 'unknown'}"`);
      } else {
        console.log('Login status:   ❌ not logged in (run --login to authenticate)');
      }
    } finally {
      await context.close();
    }
  } else {
    console.log('Login status:   ❌ no session (run --login first)');
  }

  // Show claim history
  const claimedPath = path.join(cfg.dir.data, 'claimed.json');
  if (existsSync(claimedPath)) {
    const db = jsonDb(claimedPath, { history: [] });
    const total = db.data.history.length;
    console.log(`\nClaim history:  ${total} run(s) recorded`);
    if (total > 0) {
      const last = db.data.history[total - 1];
      console.log(`Last run:       ${last.date}`);
      for (const r of last.results || []) {
        const icon = r.status === 'claimed' ? '🎮' : r.status === 'already_owned' ? '📦' : '❌';
        console.log(`  ${icon} ${r.title} — ${r.status}`);
      }
    }
  } else {
    console.log('\nClaim history:  no records yet');
  }

  // Show current free games
  console.log('');
  try {
    const { current } = await fetchFreeGames({ locale: cfg.locale, country: cfg.country });
    console.log(`Free this week: ${current.map((g) => g.title).join(', ') || '(none)'}`);
  } catch {
    console.log('Free this week: (failed to fetch)');
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
  --status   Check login status and claim history
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
