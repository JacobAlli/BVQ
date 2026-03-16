import {
  addToQueue,
  removeFromQueue,
  clearQueue,
  getQueueForChannel,
  getWaitingQueue,
  getPlayerQueueEntry,
  getQueueSize,
  QueueEntryWithPlayer,
} from '../db/models/queue';
import { setQueueOpen, Channel } from '../db/models/channels';

export interface QueueStatus {
  isOpen: boolean;
  entries: QueueEntryWithPlayer[];
  size: number;
}

export function openQueue(channel: Channel): void {
  setQueueOpen(channel.id, true);
}

export function closeQueue(channel: Channel): void {
  setQueueOpen(channel.id, false);
}

export function clearChannelQueue(channel: Channel): void {
  setQueueOpen(channel.id, false);
  clearQueue(channel.id);
}

export interface JoinResult {
  success: boolean;
  position?: number;
  message: string;
}

export function joinQueue(channel: Channel, playerId: number): JoinResult {
  if (!channel.queue_open) {
    return { success: false, message: 'The queue is currently closed.' };
  }

  const existing = getPlayerQueueEntry(channel.id, playerId);
  if (existing) {
    return {
      success: false,
      message: `You're already in the queue at position #${existing.position}.`,
    };
  }

  const position = addToQueue(channel.id, playerId);
  return {
    success: true,
    position,
    message: `You joined the queue at position #${position}!`,
  };
}

export function leaveQueue(channel: Channel, playerId: number): { success: boolean; message: string } {
  const removed = removeFromQueue(channel.id, playerId);
  if (!removed) {
    return { success: false, message: "You're not in the queue." };
  }
  return { success: true, message: 'You left the queue.' };
}

export function getPosition(channel: Channel, playerId: number): string {
  const entry = getPlayerQueueEntry(channel.id, playerId);
  if (!entry) {
    return "You're not in the queue.";
  }
  // Count how many waiting entries are ahead
  const waiting = getWaitingQueue(channel.id);
  const idx = waiting.findIndex(e => e.player_id === playerId);
  if (idx === -1) {
    return `You're in the queue (status: ${entry.status}).`;
  }
  return `You're #${idx + 1} of ${waiting.length} in the queue.`;
}

export function getQueueList(channel: Channel): QueueEntryWithPlayer[] {
  return getWaitingQueue(channel.id);
}

export function getFullQueue(channel: Channel): QueueEntryWithPlayer[] {
  return getQueueForChannel(channel.id);
}

export function getWaitingCount(channel: Channel): number {
  return getQueueSize(channel.id);
}
