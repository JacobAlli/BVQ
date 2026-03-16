import React from 'react';
import { getRankClass } from '../lib/ranks';

interface PlayerCardProps {
  username: string;
  mmr: number | null;
  isStreamer?: boolean;
  compact?: boolean;
}

export default function PlayerCard({ username, mmr, isStreamer, compact }: PlayerCardProps) {
  const rankClass = getRankClass(mmr);

  if (compact) {
    return (
      <span className={`${rankClass} font-mono text-sm`}>
        {isStreamer ? `★ ${username}` : username}
        {mmr !== null && <span className="text-bvq-text-dim ml-1">({mmr})</span>}
      </span>
    );
  }

  return (
    <div className={`flex items-center justify-between px-3 py-2 bg-bvq-surface rounded border border-bvq-border ${isStreamer ? 'glow-accent' : ''}`}>
      <span className={`font-medium ${rankClass}`}>
        {isStreamer && <span className="text-bvq-accent mr-1">★</span>}
        {username}
      </span>
      <span className="font-mono text-sm text-bvq-text-dim">
        {mmr !== null ? mmr : '—'}
      </span>
    </div>
  );
}
