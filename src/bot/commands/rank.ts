import { registerCommand } from '../command-handler';
import { getPlayerByUsername } from '../../db/models/players';

registerCommand('rank', (ctx) => {
  const player = getPlayerByUsername(ctx.username);
  if (!player) {
    ctx.reply(`@${ctx.username} You're not registered. Use: !register <platform>:<gameID>`);
    return;
  }

  if (player.peak_mmr === null) {
    ctx.reply(`@${ctx.username} No MMR on file. Join with a rank (!join C3) or wait for API lookup.`);
    return;
  }

  const source = player.mmr_source === 'api' ? 'API' : player.mmr_source === 'self_report' ? 'self-reported' : 'manual';
  ctx.reply(`@${ctx.username} Your MMR: ${player.peak_mmr} (${source})`);
});
