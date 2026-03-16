import { getDb } from '../database';

export interface Player {
  id: number;
  twitch_username: string;
  platform: string;
  game_id: string;
  peak_mmr: number | null;
  mmr_source: string;
  mmr_last_updated: number | null;
  created_at: number;
  updated_at: number;
}

export function getPlayerByUsername(username: string): Player | undefined {
  return getDb().prepare(
    'SELECT * FROM players WHERE twitch_username = ?'
  ).get(username.toLowerCase()) as Player | undefined;
}

export function getPlayerById(id: number): Player | undefined {
  return getDb().prepare(
    'SELECT * FROM players WHERE id = ?'
  ).get(id) as Player | undefined;
}

export function registerPlayer(
  twitchUsername: string,
  platform: string,
  gameId: string
): Player {
  const db = getDb();
  const existing = getPlayerByUsername(twitchUsername);

  if (existing) {
    db.prepare(
      'UPDATE players SET platform = ?, game_id = ?, updated_at = unixepoch() WHERE id = ?'
    ).run(platform, gameId, existing.id);
    return getPlayerById(existing.id)!;
  }

  const result = db.prepare(
    'INSERT INTO players (twitch_username, platform, game_id) VALUES (?, ?, ?)'
  ).run(twitchUsername.toLowerCase(), platform, gameId);

  return getPlayerById(result.lastInsertRowid as number)!;
}

export function updatePlayerMmr(
  playerId: number,
  mmr: number,
  source: string
): void {
  getDb().prepare(
    'UPDATE players SET peak_mmr = ?, mmr_source = ?, mmr_last_updated = unixepoch(), updated_at = unixepoch() WHERE id = ?'
  ).run(mmr, source, playerId);
}
