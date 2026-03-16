import { getDb } from '../db/database';
import { getWaitingQueue, updateEntryStatus, QueueEntryWithPlayer } from '../db/models/queue';

/**
 * Pull the next batch of players from the top of the waiting queue.
 * Marks them as 'active'.
 */
export function pullNextBatch(channelId: number, count: number): QueueEntryWithPlayer[] {
  const waiting = getWaitingQueue(channelId);
  console.log(`[rotation] pullNextBatch: ${waiting.length} waiting, pulling ${count}`);
  for (const w of waiting) {
    console.log(`[rotation]   waiting: #${w.position} ${w.twitch_username} (games: ${w.games_played_session})`);
  }

  const batch = waiting.slice(0, count);

  for (const entry of batch) {
    updateEntryStatus(channelId, entry.player_id, 'active');
  }

  console.log('[rotation] Pulled:', batch.map(b => b.twitch_username).join(', '));
  return batch;
}

/**
 * Rotate: move all 'active' players to the back of the queue as 'waiting'.
 * Uses a transaction so the queue stays consistent if anything fails.
 */
export function rotateQueue(channelId: number): void {
  const db = getDb();

  const active = db.prepare(`
    SELECT * FROM queue_entries WHERE channel_id = ? AND status = 'active'
    ORDER BY position ASC
  `).all(channelId) as Array<{ player_id: number; games_played_session: number }>;

  if (active.length === 0) {
    console.log('[rotation] No active players to rotate.');
    return;
  }

  console.log(`[rotation] Rotating ${active.length} active players to back of queue.`);

  const rotate = db.transaction(() => {
    const maxRow = db.prepare(
      'SELECT COALESCE(MAX(position), 0) as max_pos FROM queue_entries WHERE channel_id = ?'
    ).get(channelId) as { max_pos: number };
    let nextPos = maxRow.max_pos + 1;

    console.log(`[rotation] Current max position: ${maxRow.max_pos}, new positions start at ${nextPos}`);

    for (const entry of active) {
      db.prepare(`
        UPDATE queue_entries
        SET status = 'waiting', position = ?, games_played_session = ?
        WHERE channel_id = ? AND player_id = ?
      `).run(nextPos, entry.games_played_session + 1, channelId, entry.player_id);
      console.log(`[rotation]   player_id=${entry.player_id} → position ${nextPos} (games: ${entry.games_played_session + 1})`);
      nextPos++;
    }
  });

  rotate();

  // Log final queue state
  const all = db.prepare(`
    SELECT qe.position, qe.status, qe.games_played_session, p.twitch_username
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ?
    ORDER BY qe.position ASC
  `).all(channelId) as any[];
  console.log('[rotation] Queue after rotation:');
  for (const e of all) {
    console.log(`[rotation]   #${e.position} ${e.twitch_username} [${e.status}] (games: ${e.games_played_session})`);
  }
}

/**
 * Get all currently active players.
 */
export function getActivePlayers(channelId: number): QueueEntryWithPlayer[] {
  return getDb().prepare(`
    SELECT qe.*, p.twitch_username, p.platform, p.game_id, p.peak_mmr, p.mmr_source
    FROM queue_entries qe
    JOIN players p ON qe.player_id = p.id
    WHERE qe.channel_id = ? AND qe.status = 'active'
    ORDER BY qe.position ASC
  `).all(channelId) as QueueEntryWithPlayer[];
}
