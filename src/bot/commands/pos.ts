import { registerCommand } from '../command-handler';
import { getPlayerByUsername } from '../../db/models/players';
import { getPosition } from '../../queue/queue-manager';

registerCommand('pos', (ctx) => {
  const player = getPlayerByUsername(ctx.username);
  if (!player) {
    ctx.reply(`@${ctx.username} You're not in the queue.`);
    return;
  }

  ctx.reply(`@${ctx.username} ${getPosition(ctx.channel, player.id)}`);
});
