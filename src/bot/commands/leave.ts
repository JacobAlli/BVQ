import { registerCommand } from '../command-handler';
import { getPlayerByUsername } from '../../db/models/players';
import { leaveQueue } from '../../queue/queue-manager';
import { emitQueueUpdate } from '../../api/broadcast';
import { getChannelById } from '../../db/models/channels';

registerCommand('leave', (ctx) => {
  const player = getPlayerByUsername(ctx.username);
  if (!player) {
    ctx.reply(`@${ctx.username} You're not registered. Use: !register <platform>:<gameID>`);
    return;
  }

  const result = leaveQueue(ctx.channel, player.id);
  ctx.reply(`@${ctx.username} ${result.message}`);

  if (result.success) {
    const fresh = getChannelById(ctx.channel.id);
    if (fresh) emitQueueUpdate(fresh);
  }
});
