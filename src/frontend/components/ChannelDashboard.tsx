import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useWebSocket } from '../hooks/useWebSocket';
import { fetchChannel, fetchQueue, fetchTeams } from '../lib/api';
import QueuePanel from './QueuePanel';
import TeamDisplay from './TeamDisplay';
import ControlPanel from './ControlPanel';
import MatchHistory from './MatchHistory';
import Settings from './Settings';

type Tab = 'live' | 'history' | 'settings';

interface ChannelInfo {
  id: number;
  twitchChannel: string;
  streamerUsername: string;
  defaultFormat: string;
  queueOpen: boolean;
}

export default function ChannelDashboard() {
  const { channelName } = useParams<{ channelName: string }>();
  const { queue, teams, connected, setQueue, setTeams } = useWebSocket(channelName || '');
  const [channel, setChannel] = useState<ChannelInfo | null>(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState<Tab>('live');

  useEffect(() => {
    if (!channelName) return;

    fetchChannel(channelName)
      .then(setChannel)
      .catch(() => setError('Channel not found'));

    // Load initial queue + teams state from REST
    fetchQueue(channelName).then(setQueue).catch(() => {});
    fetchTeams(channelName).then(data => { if (data) setTeams(data); }).catch(() => {});
  }, [channelName]);

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-bvq-red mb-2">Channel Not Found</h1>
          <p className="text-bvq-text-dim">"{channelName}" is not a registered channel.</p>
        </div>
      </div>
    );
  }

  if (!channel) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-bvq-text-dim">Loading...</p>
      </div>
    );
  }

  const isOpen = queue?.isOpen ?? channel.queueOpen;
  const format = queue?.format ?? channel.defaultFormat;

  return (
    <div className="min-h-screen bg-bvq-bg">
      {/* Header */}
      <header className="border-b border-bvq-border bg-bvq-surface">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-bvq-accent font-bold text-lg tracking-tight">BVQ</span>
            <span className="text-bvq-border">|</span>
            <span className="font-semibold">{channel.streamerUsername}</span>
          </div>
          <div className="flex items-center gap-3 text-xs font-mono">
            <span className={connected ? 'text-bvq-green' : 'text-bvq-red'}>
              {connected ? 'LIVE' : 'DISCONNECTED'}
            </span>
          </div>
        </div>
      </header>

      {/* Tab nav */}
      <nav className="border-b border-bvq-border bg-bvq-surface">
        <div className="max-w-7xl mx-auto px-4 flex gap-1">
          {(['live', 'history', 'settings'] as Tab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                tab === t
                  ? 'border-bvq-accent text-bvq-accent'
                  : 'border-transparent text-bvq-text-dim hover:text-bvq-text'
              }`}
            >
              {t === 'live' ? 'Live' : t === 'history' ? 'Match History' : 'Settings'}
            </button>
          ))}
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        {tab === 'live' && (
          <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr_240px] gap-6">
            <QueuePanel queue={queue} />
            <TeamDisplay teams={teams} />
            <ControlPanel
              channelName={channelName || ''}
              isOpen={isOpen}
              format={format}
            />
          </div>
        )}

        {tab === 'history' && (
          <div className="max-w-3xl">
            <h2 className="text-lg font-semibold text-bvq-accent mb-4">Match History</h2>
            <MatchHistory channelName={channelName || ''} />
          </div>
        )}

        {tab === 'settings' && (
          <div className="max-w-2xl">
            <h2 className="text-lg font-semibold text-bvq-accent mb-4">Channel Settings</h2>
            <Settings channelName={channelName || ''} />
          </div>
        )}
      </main>
    </div>
  );
}
