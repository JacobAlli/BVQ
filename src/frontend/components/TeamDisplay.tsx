import React from 'react';
import { TeamsState } from '../hooks/useWebSocket';
import PlayerCard from './PlayerCard';
import { getDiffColor } from '../lib/ranks';

interface TeamDisplayProps {
  teams: TeamsState | null;
}

export default function TeamDisplay({ teams }: TeamDisplayProps) {
  if (!teams) {
    return (
      <div className="bg-bvq-card rounded-lg border border-bvq-border p-6 flex items-center justify-center min-h-[300px]">
        <div className="text-center">
          <p className="text-bvq-text-dim text-lg">No active match</p>
          <p className="text-bvq-text-dim text-sm mt-1">Use !balance in chat or the control panel</p>
        </div>
      </div>
    );
  }

  const diffColor = getDiffColor(teams.mmrDiff);

  return (
    <div className="bg-bvq-card rounded-lg border border-bvq-border p-4">
      <div className="text-center mb-4">
        <span className="text-xs font-mono text-bvq-text-dim">{teams.format}</span>
        <div className={`text-sm font-mono mt-1 ${diffColor}`}>
          MMR Diff: {teams.mmrDiff}
        </div>
      </div>

      <div className="grid grid-cols-[1fr_auto_1fr] gap-4 items-start">
        {/* Team A */}
        <div>
          <div className="text-center mb-3">
            <h3 className="text-sm font-bold text-bvq-accent uppercase tracking-wider">Team A</h3>
            <span className="text-xs font-mono text-bvq-text-dim">avg {teams.teamAAvgMmr}</span>
          </div>
          <div className="space-y-2">
            {teams.teamA.map(p => (
              <PlayerCard
                key={p.username}
                username={p.username}
                mmr={p.mmr}
                isStreamer={p.isStreamer}
              />
            ))}
          </div>
        </div>

        {/* VS divider */}
        <div className="flex items-center justify-center pt-8">
          <span className="text-2xl font-bold text-bvq-border">VS</span>
        </div>

        {/* Team B */}
        <div>
          <div className="text-center mb-3">
            <h3 className="text-sm font-bold text-bvq-red uppercase tracking-wider">Team B</h3>
            <span className="text-xs font-mono text-bvq-text-dim">avg {teams.teamBAvgMmr}</span>
          </div>
          <div className="space-y-2">
            {teams.teamB.map(p => (
              <PlayerCard
                key={p.username}
                username={p.username}
                mmr={p.mmr}
                isStreamer={p.isStreamer}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
