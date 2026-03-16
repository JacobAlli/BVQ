import React, { useEffect, useState } from 'react';
import { fetchMatches } from '../lib/api';
import { getDiffColor } from '../lib/ranks';

interface MatchPlayer {
  username: string;
  mmr: number | null;
  isStreamer: boolean;
}

interface Match {
  id: number;
  format: string;
  teamA: MatchPlayer[];
  teamB: MatchPlayer[];
  teamAAvgMmr: number;
  teamBAvgMmr: number;
  mmrDiff: number;
  createdAt: number;
}

interface MatchHistoryProps {
  channelName: string;
}

export default function MatchHistory({ channelName }: MatchHistoryProps) {
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatches(channelName)
      .then(setMatches)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [channelName]);

  if (loading) {
    return <p className="text-bvq-text-dim text-sm">Loading matches...</p>;
  }

  if (matches.length === 0) {
    return <p className="text-bvq-text-dim text-sm italic">No matches yet this session.</p>;
  }

  return (
    <div className="space-y-2">
      {matches.map(m => (
        <div key={m.id} className="bg-bvq-surface rounded border border-bvq-border p-3 text-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="font-mono text-bvq-text-dim text-xs">{m.format}</span>
            <span className={`font-mono text-xs ${getDiffColor(m.mmrDiff)}`}>
              diff: {m.mmrDiff}
            </span>
          </div>
          <div className="grid grid-cols-[1fr_auto_1fr] gap-2 text-xs">
            <div>
              <span className="text-bvq-accent font-semibold">A ({m.teamAAvgMmr}): </span>
              {m.teamA.map(p => p.isStreamer ? `★${p.username}` : p.username).join(', ')}
            </div>
            <span className="text-bvq-border font-bold">vs</span>
            <div>
              <span className="text-bvq-red font-semibold">B ({m.teamBAvgMmr}): </span>
              {m.teamB.map(p => p.username).join(', ')}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
