import { registerCommand } from '../command-handler';
import { setFormat } from '../../db/models/channels';

const VALID_FORMATS = ['2v2', '3v3', '4v4'];

registerCommand('format', (ctx) => {
  if (!ctx.isMod) {
    ctx.reply(`@${ctx.username} Only mods can change the format.`);
    return;
  }

  const fmt = ctx.args[0]?.toLowerCase();
  if (!fmt || !VALID_FORMATS.includes(fmt)) {
    ctx.reply(`@${ctx.username} Usage: !format <2v2|3v3|4v4> — Current: ${ctx.channel.default_format}`);
    return;
  }

  setFormat(ctx.channel.id, fmt);
  ctx.reply(`Format set to ${fmt}.`);
});
