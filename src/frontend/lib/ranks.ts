export function getRankTier(mmr: number | null): string {
  if (mmr === null) return 'unranked';
  if (mmr >= 1900) return 'ssl';
  if (mmr >= 1500) return 'gc';
  if (mmr >= 1100) return 'champion';
  if (mmr >= 900) return 'diamond';
  if (mmr >= 700) return 'platinum';
  if (mmr >= 500) return 'gold';
  if (mmr >= 300) return 'silver';
  return 'bronze';
}

export function getRankClass(mmr: number | null): string {
  return `rank-${getRankTier(mmr)}`;
}

export function getRankLabel(mmr: number | null): string {
  if (mmr === null) return 'Unranked';
  const tier = getRankTier(mmr);
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

export function getDiffColor(diff: number): string {
  if (diff < 50) return 'text-bvq-green';
  if (diff <= 150) return 'text-bvq-yellow';
  return 'text-bvq-red';
}
