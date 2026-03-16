import tmi from 'tmi.js';
import { getChannelByName, Channel } from '../db/models/channels';
import { getClient } from './twitch-client';

export interface CommandContext {
  channel: Channel;
  channelName: string;
  username: string;
  userstate: tmi.ChatUserstate;
  args: string[];
  isMod: boolean;
  isBroadcaster: boolean;
  reply: (message: string) => void;
}

type CommandHandler = (ctx: CommandContext) => void | Promise<void>;

const commands = new Map<string, CommandHandler>();

export function registerCommand(name: string, handler: CommandHandler): void {
  commands.set(name.toLowerCase(), handler);
}

export function handleMessage(
  channelRaw: string,
  userstate: tmi.ChatUserstate,
  message: string,
  self: boolean
): void {
  if (self) return;

  const trimmed = message.trim();
  if (!trimmed.startsWith('!')) return;

  const parts = trimmed.slice(1).split(/\s+/);
  const commandName = parts[0].toLowerCase();
  const args = parts.slice(1);

  const handler = commands.get(commandName);
  if (!handler) return;

  const channelName = channelRaw.replace('#', '').toLowerCase();
  const channel = getChannelByName(channelName);
  if (!channel) return;

  const username = (userstate.username || '').toLowerCase();
  const isBroadcaster = userstate.badges?.broadcaster === '1';
  const isMod = isBroadcaster || userstate.mod === true;

  const ctx: CommandContext = {
    channel,
    channelName,
    username,
    userstate,
    args,
    isMod,
    isBroadcaster,
    reply: (msg: string) => {
      getClient().say(channelRaw, msg);
    },
  };

  try {
    const result = handler(ctx);
    if (result instanceof Promise) {
      result.catch(err => {
        console.error(`[cmd] Error in !${commandName}:`, err);
        ctx.reply(`Something went wrong with !${commandName}. Try again.`);
      });
    }
  } catch (err) {
    console.error(`[cmd] Error in !${commandName}:`, err);
    ctx.reply(`Something went wrong with !${commandName}. Try again.`);
  }
}
