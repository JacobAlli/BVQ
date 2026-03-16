export interface PlayerMmr {
  playerId: number;
  mmr: number;
}

export interface BalanceResult {
  teamA: PlayerMmr[];
  teamB: PlayerMmr[];
  teamAAvgMmr: number;
  teamBAvgMmr: number;
  mmrDiff: number;
}

const FORMAT_TEAM_SIZE: Record<string, number> = {
  '2v2': 2,
  '3v3': 3,
  '4v4': 4,
};

export function getTeamSize(format: string): number {
  return FORMAT_TEAM_SIZE[format] || 3;
}

export function getTotalSlots(format: string): number {
  return getTeamSize(format) * 2;
}

/**
 * Find the optimal team split that minimizes MMR difference.
 * All players are treated equally — no fixed streamer slot.
 */
export function balanceTeams(
  players: PlayerMmr[],
  format: string
): BalanceResult {
  const teamSize = getTeamSize(format);
  const totalNeeded = teamSize * 2;

  if (players.length !== totalNeeded) {
    throw new Error(`Expected ${totalNeeded} players for ${format}, got ${players.length}`);
  }

  let bestSplit: { teamAIdxs: number[] } | null = null;
  let bestDiff = Infinity;
  let bestMaxSpread = Infinity;

  const indices = players.map((_, i) => i);
  const combos = combinations(indices, teamSize);

  for (const teamAIdxs of combos) {
    const teamASet = new Set(teamAIdxs);
    const teamBIdxs = indices.filter(i => !teamASet.has(i));

    const teamAMmrs = teamAIdxs.map(i => players[i].mmr);
    const teamBMmrs = teamBIdxs.map(i => players[i].mmr);

    const diff = Math.abs(avg(teamAMmrs) - avg(teamBMmrs));

    if (diff < bestDiff || (diff === bestDiff && shouldPrefer(teamAMmrs, teamBMmrs, bestMaxSpread))) {
      bestDiff = diff;
      bestSplit = { teamAIdxs };
      bestMaxSpread = Math.max(spread(teamAMmrs), spread(teamBMmrs));
    }
  }

  const teamAIdxSet = new Set(bestSplit!.teamAIdxs);
  const teamAPlayers = bestSplit!.teamAIdxs.map(i => players[i]);
  const teamBPlayers = indices.filter(i => !teamAIdxSet.has(i)).map(i => players[i]);

  const teamAAvg = Math.round(avg(teamAPlayers.map(p => p.mmr)));
  const teamBAvg = Math.round(avg(teamBPlayers.map(p => p.mmr)));

  return {
    teamA: teamAPlayers,
    teamB: teamBPlayers,
    teamAAvgMmr: teamAAvg,
    teamBAvgMmr: teamBAvg,
    mmrDiff: Math.abs(teamAAvg - teamBAvg),
  };
}

/** On ties, prefer the split that doesn't stack all high-MMR players together */
function shouldPrefer(teamAMmrs: number[], teamBMmrs: number[], bestMaxSpread: number): boolean {
  const maxSpread = Math.max(spread(teamAMmrs), spread(teamBMmrs));
  return maxSpread < bestMaxSpread;
}

function avg(nums: number[]): number {
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function spread(nums: number[]): number {
  return Math.max(...nums) - Math.min(...nums);
}

/** Generate all k-combinations from an array */
function combinations<T>(arr: T[], k: number): T[][] {
  if (k === 0) return [[]];
  if (arr.length < k) return [];

  const result: T[][] = [];

  function recurse(start: number, current: T[]): void {
    if (current.length === k) {
      result.push([...current]);
      return;
    }
    for (let i = start; i <= arr.length - (k - current.length); i++) {
      current.push(arr[i]);
      recurse(i + 1, current);
      current.pop();
    }
  }

  recurse(0, []);
  return result;
}
