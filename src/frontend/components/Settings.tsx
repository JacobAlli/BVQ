import React, { useEffect, useState } from 'react';
import { fetchSettings, updateSettings } from '../lib/api';

interface SettingsProps {
  channelName: string;
}

interface SettingsData {
  streamerUsername: string;
  streamerPlatform: string;
  streamerGameId: string;
  streamerMmr: number;
  defaultFormat: string;
  defaultMmr: number;
}

export default function Settings({ channelName }: SettingsProps) {
  const [data, setData] = useState<SettingsData | null>(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  useEffect(() => {
    fetchSettings(channelName).then(setData).catch(() => {});
  }, [channelName]);

  if (!data) return <p className="text-bvq-text-dim text-sm">Loading settings...</p>;

  const handleSave = async () => {
    setSaving(true);
    setMsg('');
    try {
      await updateSettings(channelName, {
        streamerGameId: data.streamerGameId,
        streamerPlatform: data.streamerPlatform,
        streamerMmr: data.streamerMmr,
        defaultFormat: data.defaultFormat,
        defaultMmr: data.defaultMmr,
      });
      setMsg('Saved!');
    } catch {
      setMsg('Failed to save.');
    }
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <label className="block">
          <span className="text-xs text-bvq-text-dim">Platform</span>
          <select
            className="mt-1 block w-full bg-bvq-surface border border-bvq-border rounded px-3 py-2 text-sm text-bvq-text"
            value={data.streamerPlatform}
            onChange={e => setData({ ...data, streamerPlatform: e.target.value })}
          >
            <option value="epic">Epic</option>
            <option value="steam">Steam</option>
            <option value="psn">PSN</option>
            <option value="xbox">Xbox</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-bvq-text-dim">Game ID</span>
          <input
            className="mt-1 block w-full bg-bvq-surface border border-bvq-border rounded px-3 py-2 text-sm text-bvq-text"
            value={data.streamerGameId}
            onChange={e => setData({ ...data, streamerGameId: e.target.value })}
          />
        </label>

        <label className="block">
          <span className="text-xs text-bvq-text-dim">Streamer MMR</span>
          <input
            type="number"
            className="mt-1 block w-full bg-bvq-surface border border-bvq-border rounded px-3 py-2 text-sm text-bvq-text"
            value={data.streamerMmr}
            onChange={e => setData({ ...data, streamerMmr: parseInt(e.target.value) || 0 })}
          />
        </label>

        <label className="block">
          <span className="text-xs text-bvq-text-dim">Default Format</span>
          <select
            className="mt-1 block w-full bg-bvq-surface border border-bvq-border rounded px-3 py-2 text-sm text-bvq-text"
            value={data.defaultFormat}
            onChange={e => setData({ ...data, defaultFormat: e.target.value })}
          >
            <option value="2v2">2v2</option>
            <option value="3v3">3v3</option>
            <option value="4v4">4v4</option>
          </select>
        </label>

        <label className="block">
          <span className="text-xs text-bvq-text-dim">Default MMR (unranked players)</span>
          <input
            type="number"
            className="mt-1 block w-full bg-bvq-surface border border-bvq-border rounded px-3 py-2 text-sm text-bvq-text"
            value={data.defaultMmr}
            onChange={e => setData({ ...data, defaultMmr: parseInt(e.target.value) || 0 })}
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-bvq-accent text-black font-semibold rounded text-sm glow-accent-hover transition-all disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Settings'}
        </button>
        {msg && <span className="text-xs text-bvq-text-dim">{msg}</span>}
      </div>
    </div>
  );
}
