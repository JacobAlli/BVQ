import { registerCommand } from '../command-handler';
import { getTotalSlots, getTeamSize, balanceTeams } from '../../balance/balance-engine';
import { resolveAllMmr } from '../../balance/mmr-resolver';
import { pullNextBatch, rotateQueue } from '../../queue/rotation';
import { getWaitingCount } from '../../queue/queue-manager';
import { getChannelById } from '../../db/models/channels';
import { insertMatch } from '../../db/models/matches';
import { postTeams, setLastBalanceData } from './balance';
import { emitQueueUpdate, emitTeamsUpdate } from '../../api/broadcast';

registerCommand('next', async (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can advance the queue.`);
    return;
  }

  // Rotate current active players to back of queue
  rotateQueue(ctx.channel.id);

  const format = ctx.channel.default_format;
  const totalSlots = getTotalSlots(format);
  const waitingCount = getWaitingCount(ctx.channel);

  if (waitingCount < totalSlots) {
    const teamSize = getTeamSize(format);
    ctx.reply(
      `Not enough players in queue for ${format}. Need ${totalSlots}, have ${waitingCount}. (${teamSize}v${teamSize})`
    );
    return;
  }

  // Pull next batch
  const batch = pullNextBatch(ctx.channel.id, totalSlots);
  const playerIds = batch.map(e => e.player_id);

  // Resolve MMR
  const mmrMap = await resolveAllMmr(playerIds, format, ctx.channel.default_mmr);
  const players = playerIds.map(id => ({ playerId: id, mmr: mmrMap.get(id)! }));

  // Balance
  const result = balanceTeams(players, format);

  // Store for reroll + dashboard persistence
  setLastBalanceData(ctx.channel.id, { players, format, result });

  // Record match
  insertMatch(
    ctx.channel.id,
    format,
    result.teamA.map(p => p.playerId),
    result.teamB.map(p => p.playerId),
    result.teamAAvgMmr,
    result.teamBAvgMmr
  );

  const fresh = getChannelById(ctx.channel.id);
  if (fresh) {
    emitQueueUpdate(fresh);
    emitTeamsUpdate(fresh, result);
  }

  postTeams(ctx, result);
});
