import tmi from 'tmi.js';
import { config } from '../config';
import { getAllChannels } from '../db/models/channels';

let client: tmi.Client;
let joinedChannels: Set<string> = new Set();
let pollInterval: ReturnType<typeof setInterval> | null = null;

export function getClient(): tmi.Client {
  if (!client) {
    throw new Error('Twitch client not initialized. Call initTwitchClient() first.');
  }
  return client;
}

export async function initTwitchClient(
  onMessage: (channel: string, userstate: tmi.ChatUserstate, message: string, self: boolean) => void
): Promise<tmi.Client> {
  const channels = getAllChannels().map(c => c.twitch_channel);

  client = new tmi.Client({
    options: { debug: false },
    identity: {
      username: config.twitch.username,
      password: config.twitch.oauthToken,
    },
    channels,
  });

  client.on('message', onMessage);

  client.on('connected', (addr, port) => {
    console.log(`[twitch] Connected to ${addr}:${port}`);
  });

  client.on('join', (channel, username, self) => {
    if (self) {
      const name = channel.replace('#', '');
      joinedChannels.add(name);
      console.log(`[twitch] Joined #${name}`);
    }
  });

  await client.connect();

  for (const ch of channels) {
    joinedChannels.add(ch);
  }

  // Start polling for new channels
  startChannelPolling();

  return client;
}

function startChannelPolling(): void {
  if (pollInterval) return;

  pollInterval = setInterval(async () => {
    const dbChannels = getAllChannels().map(c => c.twitch_channel);

    for (const ch of dbChannels) {
      if (!joinedChannels.has(ch)) {
        try {
          await client.join(ch);
          joinedChannels.add(ch);
          console.log(`[twitch] Auto-joined new channel #${ch}`);
        } catch (err) {
          console.error(`[twitch] Failed to join #${ch}:`, err);
        }
      }
    }
  }, config.channelPollIntervalMs);
}

export function stopChannelPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}
