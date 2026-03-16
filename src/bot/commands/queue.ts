import { registerCommand } from '../command-handler';
import {
  openQueue,
  closeQueue,
  clearChannelQueue,
  getQueueList,
  getWaitingCount,
} from '../../queue/queue-manager';
import { emitQueueUpdate } from '../../api/broadcast';
import { getChannelById } from '../../db/models/channels';

registerCommand('queue', (ctx) => {
  const sub = (ctx.args[0] || '').toLowerCase();

  if (['open', 'close', 'clear'].includes(sub) && !ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods and the broadcaster can manage the queue.`);
    return;
  }

  switch (sub) {
    case 'open': {
      openQueue(ctx.channel);
      ctx.reply('The queue is now OPEN! Type !join to enter.');
      const freshOpen = getChannelById(ctx.channel.id);
      if (freshOpen) emitQueueUpdate(freshOpen);
      break;
    }

    case 'close': {
      closeQueue(ctx.channel);
      ctx.reply('The queue is now CLOSED. No new joins accepted.');
      const freshClose = getChannelById(ctx.channel.id);
      if (freshClose) emitQueueUpdate(freshClose);
      break;
    }

    case 'clear': {
      clearChannelQueue(ctx.channel);
      ctx.reply('The queue has been cleared and closed.');
      const freshClear = getChannelById(ctx.channel.id);
      if (freshClear) emitQueueUpdate(freshClear);
      break;
    }

    case 'list': {
      const entries = getQueueList(ctx.channel);
      if (entries.length === 0) {
        ctx.reply('The queue is empty.');
        return;
      }

      // Twitch has a 500-char message limit, show top entries
      const lines = entries.slice(0, 10).map((e, i) =>
        `${i + 1}. ${e.twitch_username}${e.peak_mmr ? ` (${e.peak_mmr})` : ''}`
      );
      const more = entries.length > 10 ? ` (+${entries.length - 10} more)` : '';
      ctx.reply(`Queue (${entries.length}): ${lines.join(' | ')}${more}`);
      break;
    }

    default: {
      const count = getWaitingCount(ctx.channel);
      const status = ctx.channel.queue_open ? 'OPEN' : 'CLOSED';
      ctx.reply(`Queue is ${status} — ${count} player${count === 1 ? '' : 's'} waiting.`);
      break;
    }
  }
});
