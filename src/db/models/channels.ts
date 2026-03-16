import { getDb } from '../database';

export interface Channel {
  id: number;
  twitch_channel: string;
  streamer_twitch_username: string;
  streamer_platform: string;
  streamer_game_id: string;
  streamer_mmr: number;
  default_format: string;
  default_mmr: number;
  queue_open: number;
  created_at: number;
}

export function getAllChannels(): Channel[] {
  return getDb().prepare('SELECT * FROM channels').all() as Channel[];
}

export function getChannelByName(twitchChannel: string): Channel | undefined {
  return getDb().prepare(
    'SELECT * FROM channels WHERE twitch_channel = ?'
  ).get(twitchChannel) as Channel | undefined;
}

export function getChannelById(id: number): Channel | undefined {
  return getDb().prepare(
    'SELECT * FROM channels WHERE id = ?'
  ).get(id) as Channel | undefined;
}

export function setQueueOpen(channelId: number, open: boolean): void {
  getDb().prepare(
    'UPDATE channels SET queue_open = ? WHERE id = ?'
  ).run(open ? 1 : 0, channelId);
}

export function setFormat(channelId: number, format: string): void {
  getDb().prepare(
    'UPDATE channels SET default_format = ? WHERE id = ?'
  ).run(format, channelId);
}
