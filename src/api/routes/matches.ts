import { FastifyInstance } from 'fastify';
import { getChannelByName } from '../../db/models/channels';
import { getMatchHistory } from '../../db/models/matches';
import { getPlayerById } from '../../db/models/players';

export function registerMatchRoutes(app: FastifyInstance): void {
  app.get<{ Params: { channelName: string }; Querystring: { limit?: string } }>(
    '/api/channels/:channelName/matches',
    (req, reply) => {
      const channel = getChannelByName(req.params.channelName.toLowerCase());
      if (!channel) {
        return reply.code(404).send({ error: 'Channel not found' });
      }

      const limit = Math.min(parseInt(req.query.limit || '20', 10), 100);
      const matches = getMatchHistory(channel.id, limit);

      return reply.send(
        matches.map(m => {
          const teamAIds: number[] = JSON.parse(m.team_a);
          const teamBIds: number[] = JSON.parse(m.team_b);

          const streamerName = channel.streamer_twitch_username.toLowerCase();
          const mapPlayer = (id: number) => {
            const p = getPlayerById(id);
            const username = p?.twitch_username ?? '???';
            return { username, mmr: p?.peak_mmr, isStreamer: username.toLowerCase() === streamerName };
          };

          return {
            id: m.id,
            format: m.format,
            teamA: teamAIds.map(mapPlayer),
            teamB: teamBIds.map(mapPlayer),
            teamAAvgMmr: m.team_a_avg_mmr,
            teamBAvgMmr: m.team_b_avg_mmr,
            mmrDiff: m.mmr_diff,
            createdAt: m.created_at,
          };
        })
      );
    }
  );
}
