import { FastifyInstance } from 'fastify';
import { getChannelByName } from '../../db/models/channels';
import { getDb } from '../../db/database';

export function registerSettingsRoutes(app: FastifyInstance): void {
  app.get<{ Params: { channelName: string } }>(
    '/api/channels/:channelName/settings',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      return reply.send({
        streamerUsername: channel.streamer_twitch_username,
        streamerPlatform: channel.streamer_platform,
        streamerGameId: channel.streamer_game_id,
        streamerMmr: channel.streamer_mmr,
        defaultFormat: channel.default_format,
        defaultMmr: channel.default_mmr,
      });
    }
  );

  app.put<{
    Params: { channelName: string };
    Body: {
      streamerGameId?: string;
      streamerPlatform?: string;
      streamerMmr?: number;
      defaultFormat?: string;
      defaultMmr?: number;
    };
  }>(
    '/api/channels/:channelName/settings',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      const { streamerGameId, streamerPlatform, streamerMmr, defaultFormat, defaultMmr } = req.body;
      const db = getDb();

      if (streamerGameId !== undefined) {
        db.prepare('UPDATE channels SET streamer_game_id = ? WHERE id = ?').run(streamerGameId, channel.id);
      }
      if (streamerPlatform !== undefined) {
        db.prepare('UPDATE channels SET streamer_platform = ? WHERE id = ?').run(streamerPlatform, channel.id);
      }
      if (streamerMmr !== undefined) {
        db.prepare('UPDATE channels SET streamer_mmr = ? WHERE id = ?').run(streamerMmr, channel.id);
      }
      if (defaultFormat !== undefined) {
        db.prepare('UPDATE channels SET default_format = ? WHERE id = ?').run(defaultFormat, channel.id);
      }
      if (defaultMmr !== undefined) {
        db.prepare('UPDATE channels SET default_mmr = ? WHERE id = ?').run(defaultMmr, channel.id);
      }

      return reply.send({ success: true });
    }
  );
}
