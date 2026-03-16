import { registerCommand } from '../command-handler';
import { getPlayerByUsername, updatePlayerMmr } from '../../db/models/players';
import { joinQueue } from '../../queue/queue-manager';
import { parseRankToMmr } from '../../balance/rank-parser';
import { emitQueueUpdate } from '../../api/broadcast';
import { getChannelById } from '../../db/models/channels';

registerCommand('join', (ctx) => {
  const player = getPlayerByUsername(ctx.username);
  if (!player) {
    ctx.reply(`@${ctx.username} You need to register first! Use: !register <platform>:<gameID>`);
    return;
  }

  if (ctx.args[0]) {
    const mmr = parseRankToMmr(ctx.args[0]);
    if (mmr !== null) {
      updatePlayerMmr(player.id, mmr, 'self_report');
    }
  }

  const result = joinQueue(ctx.channel, player.id);
  ctx.reply(`@${ctx.username} ${result.message}`);

  if (result.success) {
    const fresh = getChannelById(ctx.channel.id);
    if (fresh) emitQueueUpdate(fresh);
  }
});
