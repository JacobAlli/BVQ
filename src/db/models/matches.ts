import { getDb } from '../database';

export interface Match {
  id: number;
  channel_id: number;
  format: string;
  team_a: string;
  team_b: string;
  team_a_avg_mmr: number | null;
  team_b_avg_mmr: number | null;
  mmr_diff: number | null;
  created_at: number;
}

export function insertMatch(
  channelId: number,
  format: string,
  teamA: number[],
  teamB: number[],
  teamAAvgMmr: number,
  teamBAvgMmr: number
): number {
  const result = getDb().prepare(`
    INSERT INTO matches (channel_id, format, team_a, team_b, team_a_avg_mmr, team_b_avg_mmr, mmr_diff)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(
    channelId,
    format,
    JSON.stringify(teamA),
    JSON.stringify(teamB),
    teamAAvgMmr,
    teamBAvgMmr,
    Math.abs(teamAAvgMmr - teamBAvgMmr)
  );
  return result.lastInsertRowid as number;
}

export function getMatchHistory(channelId: number, limit = 20): Match[] {
  return getDb().prepare(
    'SELECT * FROM matches WHERE channel_id = ? ORDER BY created_at DESC LIMIT ?'
  ).all(channelId, limit) as Match[];
}
