import https from 'https';

interface TrnSegment {
  type: string;
  metadata: { name: string };
  stats: {
    rating?: { value: number };
    peakRating?: { value: number };
  };
}

interface TrnResponse {
  data?: {
    segments?: TrnSegment[];
  };
  errors?: { message: string }[];
}

const PLATFORM_MAP: Record<string, string> = {
  epic: 'epic',
  steam: 'steam',
  psn: 'psn',
  xbox: 'xbl',
};

const RANKED_PLAYLISTS = [
  'Ranked Duel 1v1',
  'Ranked Doubles 2v2',
  'Ranked Standard 3v3',
];

// Simple rate limiter: max 1 request per 2 seconds
let lastRequestTime = 0;
const MIN_INTERVAL_MS = 2000;

async function waitForRateLimit(): Promise<void> {
  const now = Date.now();
  const elapsed = now - lastRequestTime;
  if (elapsed < MIN_INTERVAL_MS) {
    await new Promise(resolve => setTimeout(resolve, MIN_INTERVAL_MS - elapsed));
  }
  lastRequestTime = Date.now();
}

export async function fetchTrnMmr(
  platform: string,
  gameId: string
): Promise<number | null> {
  const trnPlatform = PLATFORM_MAP[platform];
  if (!trnPlatform) return null;

  await waitForRateLimit();

  const path = `/api/v2/rocket-league/standard/profile/${trnPlatform}/${encodeURIComponent(gameId)}`;

  try {
    const data = await makeRequest(path);
    if (!data?.data?.segments) return null;

    // Use Ranked Doubles 2v2 as the skill indicator
    const doubles = data.data.segments.find(
      (s: TrnSegment) => s.type === 'playlist' && s.metadata.name === 'Ranked Doubles 2v2'
    );

    if (!doubles) return null;

    return doubles.stats.peakRating?.value ?? doubles.stats.rating?.value ?? null;
  } catch (err) {
    console.error(`[trn] API error for ${platform}:${gameId}:`, err);
    return null;
  }
}

function makeRequest(path: string): Promise<TrnResponse | null> {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.tracker.gg',
      path,
      method: 'GET',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'Accept': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => {
        if (res.statusCode === 404) {
          resolve(null);
          return;
        }
        if (res.statusCode === 429) {
          console.warn('[trn] Rate limited');
          resolve(null);
          return;
        }
        if (res.statusCode && res.statusCode >= 400) {
          console.error(`[trn] HTTP ${res.statusCode}: ${body}`);
          resolve(null);
          return;
        }
        try {
          resolve(JSON.parse(body));
        } catch {
          resolve(null);
        }
      });
    });

    req.on('error', reject);
    req.setTimeout(10000, () => {
      req.destroy();
      reject(new Error('TRN API request timed out'));
    });
    req.end();
  });
}
