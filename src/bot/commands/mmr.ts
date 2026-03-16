import { registerCommand } from '../command-handler';
import { getPlayerByUsername } from '../../db/models/players';
import { resolveMmr } from '../../balance/mmr-resolver';

registerCommand('mmr', async (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can look up other players' MMR.`);
    return;
  }

  const target = ctx.args[0]?.toLowerCase().replace('@', '');
  if (!target) {
    ctx.reply(`@${ctx.username} Usage: !mmr <username>`);
    return;
  }

  const player = getPlayerByUsername(target);
  if (!player) {
    ctx.reply(`@${ctx.username} Player "${target}" is not registered.`);
    return;
  }

  const mmr = await resolveMmr(player.id, ctx.channel.default_format, ctx.channel.default_mmr);
  const source = player.mmr_source === 'api' ? 'API' : player.mmr_source === 'self_report' ? 'self-reported' : 'default';
  ctx.reply(`@${ctx.username} ${target}'s MMR: ${mmr} (${source})`);
});
