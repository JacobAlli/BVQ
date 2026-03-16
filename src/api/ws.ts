import { Server as HttpServer } from 'http';
import { Server as SocketServer } from 'socket.io';

let io: SocketServer | null = null;

export function initWebSocket(httpServer: HttpServer): void {
  io = new SocketServer(httpServer, {
    cors: { origin: '*' },
    path: '/socket.io/',
  });

  io.on('connection', (socket) => {
    // Client joins a channel room
    socket.on('join-channel', (channelName: string) => {
      socket.join(`channel:${channelName.toLowerCase()}`);
    });

    socket.on('leave-channel', (channelName: string) => {
      socket.leave(`channel:${channelName.toLowerCase()}`);
    });
  });
}

export function broadcastQueueUpdate(channelName: string, data: any): void {
  io?.to(`channel:${channelName.toLowerCase()}`).emit('queue-update', data);
}

export function broadcastTeamsUpdate(channelName: string, data: any): void {
  io?.to(`channel:${channelName.toLowerCase()}`).emit('teams-update', data);
}

export function broadcastMatchUpdate(channelName: string, data: any): void {
  io?.to(`channel:${channelName.toLowerCase()}`).emit('match-update', data);
}

export function broadcastSettingsUpdate(channelName: string, data: any): void {
  io?.to(`channel:${channelName.toLowerCase()}`).emit('settings-update', data);
}
