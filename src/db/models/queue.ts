import { getDb } from '../database';

export interface QueueEntry {
  id: number;
  channel_id: number;
  player_id: number;
  position: number;
  status: string;
  games_played_session: number;
  joined_at: number;
}

export interface QueueEntryWithPlayer extends QueueEntry {
  twitch_username: string;
  platform: string;
  game_id: string;
  peak_mmr: number | null;
  mmr_source: string;
}

export function getQueueForChannel(channelId: number): QueueEntryWithPlayer[] {
  return getDb().prepare(`
    SELECT qe.*, p.twitch_username, p.platform, p.game_id, p.peak_mmr, p.mmr_source
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ?
    ORDER BY qe.position ASC
  `).all(channelId) as QueueEntryWithPlayer[];
}

export function getWaitingQueue(channelId: number): QueueEntryWithPlayer[] {
  return getDb().prepare(`
    SELECT qe.*, p.twitch_username, p.platform, p.game_id, p.peak_mmr, p.mmr_source
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ? AND qe.status = 'waiting'
    ORDER BY qe.position ASC
  `).all(channelId) as QueueEntryWithPlayer[];
}

export function getPlayerQueueEntry(
  channelId: number,
  playerId: number
): QueueEntryWithPlayer | undefined {
  return getDb().prepare(`
    SELECT qe.*, p.twitch_username, p.platform, p.game_id, p.peak_mmr, p.mmr_source
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ? AND qe.player_id = ?
  `).get(channelId, playerId) as QueueEntryWithPlayer | undefined;
}

export function addToQueue(channelId: number, playerId: number): number {
  const db = getDb();
  const maxPos = db.prepare(
    'SELECT COALESCE(MAX(position), 0) as max_pos FROM queue_entries WHERE channel_id = ?'
  ).get(channelId) as { max_pos: number };

  const position = maxPos.max_pos + 1;

  db.prepare(
    'INSERT INTO queue_entries (channel_id, player_id, position) VALUES (?, ?, ?)'
  ).run(channelId, playerId, position);

  return position;
}

export function removeFromQueue(channelId: number, playerId: number): boolean {
  const result = getDb().prepare(
    'DELETE FROM queue_entries WHERE channel_id = ? AND player_id = ?'
  ).run(channelId, playerId);
  return result.changes > 0;
}

export function clearQueue(channelId: number): void {
  getDb().prepare('DELETE FROM queue_entries WHERE channel_id = ?').run(channelId);
}

export function updateEntryStatus(
  channelId: number,
  playerId: number,
  status: string
): void {
  getDb().prepare(
    'UPDATE queue_entries SET status = ? WHERE channel_id = ? AND player_id = ?'
  ).run(status, channelId, playerId);
}

export function getQueueSize(channelId: number): number {
  const row = getDb().prepare(`
    SELECT COUNT(*) as count
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ? AND qe.status = 'waiting'
  `).get(channelId) as { count: number };
  return row.count;
}
