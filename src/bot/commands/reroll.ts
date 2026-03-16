import { registerCommand } from '../command-handler';
import { balanceTeams } from '../../balance/balance-engine';
import { getChannelById } from '../../db/models/channels';
import { insertMatch } from '../../db/models/matches';
import { getLastBalanceData, setLastBalanceData, postTeams } from './balance';
import { emitTeamsUpdate } from '../../api/broadcast';

registerCommand('reroll', (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can reroll teams.`);
    return;
  }

  const data = getLastBalanceData(ctx.channel.id);
  if (!data) {
    ctx.reply(`@${ctx.username} No active balance to reroll. Run !balance first.`);
    return;
  }

  // Shuffle the players array for a different split
  const shuffled = [...data.players].sort(() => Math.random() - 0.5);

  const result = balanceTeams(shuffled, data.format);

  // Update stored data with shuffled order
  setLastBalanceData(ctx.channel.id, { players: shuffled, format: data.format, result });

  // Record match
  insertMatch(
    ctx.channel.id,
    data.format,
    result.teamA.map(p => p.playerId),
    result.teamB.map(p => p.playerId),
    result.teamAAvgMmr,
    result.teamBAvgMmr
  );

  const fresh = getChannelById(ctx.channel.id);
  if (fresh) emitTeamsUpdate(fresh, result);

  ctx.reply('Rerolled teams!');
  postTeams(ctx, result);
});
