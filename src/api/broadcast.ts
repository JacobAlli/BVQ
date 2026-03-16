import { Channel, getChannelById } from '../db/models/channels';
import { getQueueForChannel } from '../db/models/queue';
import { getPlayerById } from '../db/models/players';
import { broadcastQueueUpdate, broadcastTeamsUpdate } from './ws';
import { BalanceResult } from '../balance/balance-engine';

export function emitQueueUpdate(channel: Channel): void {
  const entries = getQueueForChannel(channel.id);
  const waiting = entries.filter(e => e.status === 'waiting');
  const active = entries.filter(e => e.status === 'active');

  broadcastQueueUpdate(channel.twitch_channel, {
    isOpen: !!channel.queue_open,
    format: channel.default_format,
    waiting: waiting.map(e => ({
      position: e.position,
      username: e.twitch_username,
      mmr: e.peak_mmr,
      mmrSource: e.mmr_source,
      status: e.status,
      gamesPlayed: e.games_played_session,
    })),
    active: active.map(e => ({
      username: e.twitch_username,
      mmr: e.peak_mmr,
      mmrSource: e.mmr_source,
    })),
    totalWaiting: waiting.length,
  });
}

export function emitTeamsUpdate(channel: Channel, result: BalanceResult): void {
  const streamerName = channel.streamer_twitch_username.toLowerCase();

  const mapPlayer = (p: { playerId: number; mmr: number }) => {
    const player = getPlayerById(p.playerId);
    const username = player?.twitch_username ?? '???';
    return { username, mmr: p.mmr, isStreamer: username.toLowerCase() === streamerName };
  };

  broadcastTeamsUpdate(channel.twitch_channel, {
    teamA: result.teamA.map(mapPlayer),
    teamB: result.teamB.map(mapPlayer),
    teamAAvgMmr: result.teamAAvgMmr,
    teamBAvgMmr: result.teamBAvgMmr,
    mmrDiff: result.mmrDiff,
    format: channel.default_format,
  });
}

export function emitQueueRefresh(channelId: number): void {
  const channel = getChannelById(channelId);
  if (channel) emitQueueUpdate(channel);
}
