import { registerCommand } from '../command-handler';
import { registerPlayer } from '../../db/models/players';

const VALID_PLATFORMS = ['epic', 'steam', 'psn', 'xbox'];

registerCommand('register', (ctx) => {
  const raw = ctx.args[0];
  if (!raw || !raw.includes(':')) {
    ctx.reply(`@${ctx.username} Usage: !register <platform>:<gameID> — Platforms: epic, steam, psn, xbox`);
    return;
  }

  const colonIdx = raw.indexOf(':');
  const platform = raw.slice(0, colonIdx).toLowerCase();
  const gameId = raw.slice(colonIdx + 1);

  if (!VALID_PLATFORMS.includes(platform)) {
    ctx.reply(`@${ctx.username} Invalid platform "${platform}". Use: epic, steam, psn, or xbox.`);
    return;
  }

  if (!gameId) {
    ctx.reply(`@${ctx.username} You need to provide your in-game ID after the colon.`);
    return;
  }

  registerPlayer(ctx.username, platform, gameId);
  ctx.reply(`@${ctx.username} Registered as ${platform}:${gameId}!`);
});
