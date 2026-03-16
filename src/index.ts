import { config } from './config';
import { initDatabase } from './db/database';
import { initTwitchClient } from './bot/twitch-client';
import { handleMessage } from './bot/command-handler';
import { startApiServer } from './api/server';

// Register all commands
import './bot/commands';

async function main(): Promise<void> {
  console.log('[bvq] Starting BalancedViewerQueue...');

  // Initialize database
  initDatabase();
  console.log('[bvq] Database initialized.');

  // Start API + WebSocket server
  await startApiServer();
  console.log(`[bvq] API server running on http://localhost:${config.apiPort}`);

  // Connect to Twitch (skip if no credentials)
  if (config.twitch.username && config.twitch.oauthToken) {
    await initTwitchClient(handleMessage);
    console.log('[bvq] Twitch bot connected.');
  } else {
    console.log('[bvq] Twitch credentials not set — bot disabled. Set TWITCH_BOT_USERNAME and TWITCH_OAUTH_TOKEN in .env');
  }

  console.log('[bvq] Ready.');
}

main().catch((err) => {
  console.error('[bvq] Fatal error:', err);
  process.exit(1);
});
