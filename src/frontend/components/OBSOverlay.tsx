import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket, TeamsState } from '../hooks/useWebSocket';
import PlayerCard from './PlayerCard';
import { getDiffColor } from '../lib/ranks';
import { fetchQueue } from '../lib/api';

export default function OBSOverlay() {
  const { channelName } = useParams<{ channelName: string }>();
  const { queue, teams } = useWebSocket(channelName || '');
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    if (!channelName) return;
    fetchQueue(channelName)
      .then(data => setIsOpen(data.isOpen))
      .catch(() => {});
  }, [channelName]);

  useEffect(() => {
    if (queue) setIsOpen(queue.isOpen);
  }, [queue]);

  if (!channelName) return null;

  // If no teams, show idle state
  if (!teams) {
    return (
      <div className="obs-overlay p-4">
        {isOpen ? (
          <div className="bg-black/70 rounded-lg px-6 py-4 text-center inline-block">
            <p className="text-bvq-accent font-bold text-lg">Queue Open</p>
            <p className="text-gray-300 text-sm mt-1">Type <span className="font-mono text-white">!join</span> to play</p>
            {queue && <p className="text-bvq-text-dim text-xs mt-1">{queue.totalWaiting} waiting</p>}
          </div>
        ) : (
          <div className="bg-black/70 rounded-lg px-6 py-4 text-center inline-block">
            <p className="text-bvq-text-dim text-sm">Queue Closed</p>
          </div>
        )}
      </div>
    );
  }

  const diffColor = getDiffColor(teams.mmrDiff);

  return (
    <div className="obs-overlay p-4">
      <div className="bg-black/80 rounded-lg p-4 inline-block min-w-[400px]">
        <div className="text-center mb-3">
          <span className={`font-mono text-xs ${diffColor}`}>diff: {teams.mmrDiff}</span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] gap-3 items-start">
          <div>
            <h3 className="text-xs font-bold text-bvq-accent uppercase text-center mb-2">
              Team A <span className="text-bvq-text-dim font-normal">({teams.teamAAvgMmr})</span>
            </h3>
            <div className="space-y-1">
              {teams.teamA.map(p => (
                <div key={p.username} className="text-center">
                  <PlayerCard username={p.username} mmr={p.mmr} isStreamer={p.isStreamer} compact />
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center pt-5">
            <span className="text-lg font-bold text-gray-600">VS</span>
          </div>

          <div>
            <h3 className="text-xs font-bold text-bvq-red uppercase text-center mb-2">
              Team B <span className="text-bvq-text-dim font-normal">({teams.teamBAvgMmr})</span>
            </h3>
            <div className="space-y-1">
              {teams.teamB.map(p => (
                <div key={p.username} className="text-center">
                  <PlayerCard username={p.username} mmr={p.mmr} isStreamer={p.isStreamer} compact />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
