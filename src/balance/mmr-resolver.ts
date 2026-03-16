import { getCachedMmr, setCachedMmr } from '../db/models/mmr-cache';
import { getPlayerById, updatePlayerMmr } from '../db/models/players';
import { fetchTrnMmr } from './trn-client';

export async function resolveMmr(
  playerId: number,
  format: string,
  defaultMmr: number
): Promise<number> {
  const player = getPlayerById(playerId);
  if (!player) return defaultMmr;

  // 1. Check cache (keyed as 'best' since we take highest across playlists)
  const cached = getCachedMmr(playerId, 'best');
  if (cached) return cached.peak_mmr;

  // 2. Try TRN API — returns highest rating across all ranked playlists
  const apiMmr = await fetchTrnMmr(player.platform, player.game_id);
  if (apiMmr !== null) {
    setCachedMmr(playerId, 'best', apiMmr);
    updatePlayerMmr(playerId, apiMmr, 'api');
    return apiMmr;
  }

  // 3. Fall back to self-reported / previously stored MMR
  if (player.peak_mmr !== null) return player.peak_mmr;

  // 4. Default
  return defaultMmr;
}

export async function resolveAllMmr(
  playerIds: number[],
  format: string,
  defaultMmr: number
): Promise<Map<number, number>> {
  const result = new Map<number, number>();
  for (const id of playerIds) {
    result.set(id, await resolveMmr(id, format, defaultMmr));
  }
  return result;
}
