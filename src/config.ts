import dotenv from 'dotenv';
import path from 'path';

dotenv.config();

export const config = {
  twitch: {
    username: process.env.TWITCH_BOT_USERNAME || '',
    oauthToken: process.env.TWITCH_OAUTH_TOKEN || '',
  },
  apiPort: parseInt(process.env.API_PORT || '3000', 10),
  dbPath: process.env.DB_PATH || path.join(process.cwd(), 'data', 'bvq.db'),
  channelPollIntervalMs: 30_000,
};

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
  return value;
}
