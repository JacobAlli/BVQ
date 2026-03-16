import { registerCommand } from '../command-handler';
import { getPlayerByUsername } from '../../db/models/players';
import { getChannelById } from '../../db/models/channels';
import { leaveQueue } from '../../queue/queue-manager';
import { emitQueueUpdate } from '../../api/broadcast';

registerCommand('kick', (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can kick players.`);
    return;
  }

  const target = ctx.args[0]?.toLowerCase().replace('@', '');
  if (!target) {
    ctx.reply(`@${ctx.username} Usage: !kick <username>`);
    return;
  }

  const player = getPlayerByUsername(target);
  if (!player) {
    ctx.reply(`@${ctx.username} Player "${target}" not found.`);
    return;
  }

  const result = leaveQueue(ctx.channel, player.id);
  if (result.success) {
    ctx.reply(`${target} has been removed from the queue.`);
    const fresh = getChannelById(ctx.channel.id);
    if (fresh) emitQueueUpdate(fresh);
  } else {
    ctx.reply(`@${ctx.username} ${target} is not in the queue.`);
  }
});
