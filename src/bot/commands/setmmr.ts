import { registerCommand } from '../command-handler';
import { getPlayerByUsername, updatePlayerMmr } from '../../db/models/players';

registerCommand('setmmr', (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can set MMR.`);
    return;
  }

  const target = ctx.args[0]?.toLowerCase().replace('@', '');
  const mmrStr = ctx.args[1];

  if (!target || !mmrStr) {
    ctx.reply(`@${ctx.username} Usage: !setmmr <username> <mmr>`);
    return;
  }

  const mmr = parseInt(mmrStr, 10);
  if (isNaN(mmr) || mmr < 0 || mmr > 3000) {
    ctx.reply(`@${ctx.username} MMR must be a number between 0 and 3000.`);
    return;
  }

  const player = getPlayerByUsername(target);
  if (!player) {
    ctx.reply(`@${ctx.username} Player "${target}" is not registered.`);
    return;
  }

  updatePlayerMmr(player.id, mmr, 'manual');
  ctx.reply(`@${ctx.username} Set ${target}'s MMR to ${mmr}.`);
});
