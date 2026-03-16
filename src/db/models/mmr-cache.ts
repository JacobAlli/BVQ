import { getDb } from '../database';

export interface MmrCacheEntry {
  player_id: number;
  playlist: string;
  peak_mmr: number;
  fetched_at: number;
}

const CACHE_TTL_SECONDS = 24 * 60 * 60; // 24 hours

export function getCachedMmr(
  playerId: number,
  playlist: string
): MmrCacheEntry | undefined {
  const cutoff = Math.floor(Date.now() / 1000) - CACHE_TTL_SECONDS;
  return getDb().prepare(
    'SELECT * FROM mmr_cache WHERE player_id = ? AND playlist = ? AND fetched_at > ?'
  ).get(playerId, playlist, cutoff) as MmrCacheEntry | undefined;
}

export function setCachedMmr(
  playerId: number,
  playlist: string,
  peakMmr: number
): void {
  getDb().prepare(`
    INSERT INTO mmr_cache (player_id, playlist, peak_mmr, fetched_at)
    VALUES (?, ?, ?, unixepoch())
    ON CONFLICT (player_id, playlist) DO UPDATE SET
      peak_mmr = excluded.peak_mmr,
      fetched_at = excluded.fetched_at
  `).run(playerId, playlist, peakMmr);
}
