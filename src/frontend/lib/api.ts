const BASE = '/api/channels';

export async function fetchChannel(channelName: string) {
  const res = await fetch(`${BASE}/${channelName}`);
  if (!res.ok) throw new Error('Channel not found');
  return res.json();
}

export async function fetchQueue(channelName: string) {
  const res = await fetch(`${BASE}/${channelName}/queue`);
  if (!res.ok) throw new Error('Failed to fetch queue');
  return res.json();
}

export async function fetchTeams(channelName: string) {
  const res = await fetch(`${BASE}/${channelName}/teams`);
  if (!res.ok) return null;
  return res.json();
}

export async function fetchMatches(channelName: string, limit = 20) {
  const res = await fetch(`${BASE}/${channelName}/matches?limit=${limit}`);
  if (!res.ok) throw new Error('Failed to fetch matches');
  return res.json();
}

export async function fetchSettings(channelName: string) {
  const res = await fetch(`${BASE}/${channelName}/settings`);
  if (!res.ok) throw new Error('Failed to fetch settings');
  return res.json();
}

export async function updateSettings(channelName: string, data: Record<string, any>) {
  const res = await fetch(`${BASE}/${channelName}/settings`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update settings');
  return res.json();
}
