import { FastifyInstance } from 'fastify';
import { getChannelByName } from '../../db/models/channels';
import { getQueueForChannel, getWaitingQueue } from '../../db/models/queue';
import { getLastBalanceData } from '../../bot/commands/balance';
import { getPlayerById } from '../../db/models/players';

export function registerQueueRoutes(app: FastifyInstance): void {
  // Get queue for a channel
  app.get<{ Params: { channelName: string } }>(
    '/api/channels/:channelName/queue',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      const entries = getQueueForChannel(channel.id);
      const waiting = entries.filter(e => e.status === 'waiting');
      const active = entries.filter(e => e.status === 'active');

      return reply.send({
        channelId: channel.id,
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
  );

  // Get current teams
  app.get<{ Params: { channelName: string } }>(
    '/api/channels/:channelName/teams',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      const data = getLastBalanceData(channel.id);
      if (!data) {
        return reply.send(null);
      }

      const streamerName = channel.streamer_twitch_username.toLowerCase();
      const mapPlayer = (p: { playerId: number; mmr: number }) => {
        const player = getPlayerById(p.playerId);
        const username = player?.twitch_username ?? '???';
        return { username, mmr: p.mmr, isStreamer: username.toLowerCase() === streamerName };
      };

      return reply.send({
        teamA: data.result.teamA.map(mapPlayer),
        teamB: data.result.teamB.map(mapPlayer),
        teamAAvgMmr: data.result.teamAAvgMmr,
        teamBAvgMmr: data.result.teamBAvgMmr,
        mmrDiff: data.result.mmrDiff,
        format: data.format,
      });
    }
  );

  // Get channel info
  app.get<{ Params: { channelName: string } }>(
    '/api/channels/:channelName',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      return reply.send({
        id: channel.id,
        twitchChannel: channel.twitch_channel,
        streamerUsername: channel.streamer_twitch_username,
        streamerPlatform: channel.streamer_platform,
        streamerGameId: channel.streamer_game_id,
        streamerMmr: channel.streamer_mmr,
        defaultFormat: channel.default_format,
        defaultMmr: channel.default_mmr,
        queueOpen: !!channel.queue_open,
      });
    }
  );
}
