import { registerCommand, CommandContext } from '../command-handler';
import { getTotalSlots, getTeamSize, balanceTeams, BalanceResult } from '../../balance/balance-engine';
import { resolveAllMmr } from '../../balance/mmr-resolver';
import { pullNextBatch } from '../../queue/rotation';
import { getWaitingCount } from '../../queue/queue-manager';
import { getPlayerById } from '../../db/models/players';
import { getChannelById } from '../../db/models/channels';
import { insertMatch } from '../../db/models/matches';
import { emitQueueUpdate, emitTeamsUpdate } from '../../api/broadcast';

// Store the last balance result per channel for !reroll and dashboard persistence
const lastBalanceResults = new Map<number, {
  players: Array<{ playerId: number; mmr: number }>;
  format: string;
  result: BalanceResult;
}>();

export function getLastBalanceData(channelId: number) {
  return lastBalanceResults.get(channelId);
}

export function setLastBalanceData(channelId: number, data: {
  players: Array<{ playerId: number; mmr: number }>;
  format: string;
  result: BalanceResult;
}) {
  lastBalanceResults.set(channelId, data);
}

registerCommand('balance', async (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can balance teams.`);
    return;
  }

  const format = ctx.channel.default_format;
  const totalSlots = getTotalSlots(format);
  const waitingCount = getWaitingCount(ctx.channel);

  if (waitingCount < totalSlots) {
    const teamSize = getTeamSize(format);
    ctx.reply(
      `Not enough players for ${format}. Need ${totalSlots}, have ${waitingCount}. (${teamSize}v${teamSize})`
    );
    return;
  }

  // Pull players from queue
  const batch = pullNextBatch(ctx.channel.id, totalSlots);
  const playerIds = batch.map(e => e.player_id);

  // Resolve MMR for all players
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

  // Broadcast to dashboard
  const fresh = getChannelById(ctx.channel.id);
  if (fresh) {
    emitQueueUpdate(fresh);
    emitTeamsUpdate(fresh, result);
  }

  // Output
  postTeams(ctx, result);
});

export function postTeams(ctx: CommandContext, result: BalanceResult): void {
  const teamANames = result.teamA.map(p => {
    const player = getPlayerById(p.playerId);
    return `${player?.twitch_username ?? '???'}(${p.mmr})`;
  });

  const teamBNames = result.teamB.map(p => {
    const player = getPlayerById(p.playerId);
    return `${player?.twitch_username ?? '???'}(${p.mmr})`;
  });

  ctx.reply(
    `Team A [avg ${result.teamAAvgMmr}]: ${teamANames.join(', ')} | ` +
    `Team B [avg ${result.teamBAvgMmr}]: ${teamBNames.join(', ')} | ` +
    `Diff: ${result.mmrDiff}`
  );
}
