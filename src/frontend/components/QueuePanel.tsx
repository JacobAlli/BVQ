import React from 'react';
import { QueueState } from '../hooks/useWebSocket';
import { getRankClass } from '../lib/ranks';

interface QueuePanelProps {
  queue: QueueState | null;
}

export default function QueuePanel({ queue }: QueuePanelProps) {
  if (!queue) {
    return (
      <div className="bg-bvq-card rounded-lg border border-bvq-border p-4">
        <h2 className="text-lg font-semibold mb-3 text-bvq-accent">Queue</h2>
        <p className="text-bvq-text-dim text-sm">Loading...</p>
      </div>
    );
  }

  return (
    <div className="bg-bvq-card rounded-lg border border-bvq-border p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold text-bvq-accent">Queue</h2>
        <div className="flex items-center gap-2">
          <span className={`inline-block w-2 h-2 rounded-full ${queue.isOpen ? 'bg-bvq-green' : 'bg-bvq-red'}`} />
          <span className="text-xs font-mono text-bvq-text-dim">
            {queue.isOpen ? 'OPEN' : 'CLOSED'}
          </span>
        </div>
      </div>

      <div className="text-xs text-bvq-text-dim mb-3 font-mono">
        {queue.totalWaiting} waiting · {queue.format}
      </div>

      {queue.waiting.length === 0 ? (
        <p className="text-bvq-text-dim text-sm italic">No players in queue</p>
      ) : (
        <div className="space-y-1 max-h-[60vh] overflow-y-auto">
          {queue.waiting.map((player, i) => (
            <div
              key={player.username}
              className="flex items-center justify-between px-3 py-1.5 bg-bvq-surface rounded text-sm"
            >
              <div className="flex items-center gap-2">
                <span className="text-bvq-text-dim font-mono w-6 text-right">{i + 1}.</span>
                <span className={`font-medium ${getRankClass(player.mmr)}`}>
                  {player.username}
                </span>
              </div>
              <span className="font-mono text-xs text-bvq-text-dim">
                {player.mmr ?? '—'}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
