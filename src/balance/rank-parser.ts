const RANK_MAP: Record<string, number> = {
  // Full names
  bronze: 200,
  silver: 400,
  gold: 600,
  platinum: 800,
  plat: 800,
  diamond: 1000,
  champ: 1200,
  champion: 1200,
  gc: 1500,
  grandchamp: 1500,
  ssl: 1900,
  supersonic: 1900,

  // Tier shortcuts
  b1: 100, b2: 200, b3: 300,
  s1: 300, s2: 400, s3: 500,
  g1: 500, g2: 600, g3: 700,
  p1: 700, p2: 800, p3: 900,
  plat1: 700, plat2: 800, plat3: 900,
  d1: 900, d2: 1000, d3: 1100,
  diamond1: 900, diamond2: 1000, diamond3: 1100,
  c1: 1100, c2: 1300, c3: 1400,
  champ1: 1100, champ2: 1300, champ3: 1400,
  gc1: 1500, gc2: 1600, gc3: 1700,
};

export function parseRankToMmr(input: string): number | null {
  const normalized = input.toLowerCase().trim();
  return RANK_MAP[normalized] ?? null;
}
