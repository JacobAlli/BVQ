import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';

export interface QueuePlayer {
  position?: number;
  username: string;
  mmr: number | null;
  mmrSource: string;
  status?: string;
  gamesPlayed?: number;
}

export interface QueueState {
  isOpen: boolean;
  format: string;
  waiting: QueuePlayer[];
  active: QueuePlayer[];
  totalWaiting: number;
}

export interface TeamPlayer {
  username: string;
  mmr: number;
  isStreamer?: boolean;
}

export interface TeamsState {
  teamA: TeamPlayer[];
  teamB: TeamPlayer[];
  teamAAvgMmr: number;
  teamBAvgMmr: number;
  mmrDiff: number;
  format: string;
}

export function useWebSocket(channelName: string) {
  const socketRef = useRef<Socket | null>(null);
  const [queue, setQueue] = useState<QueueState | null>(null);
  const [teams, setTeams] = useState<TeamsState | null>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    const socket = io({ path: '/socket.io/' });
    socketRef.current = socket;

    socket.on('connect', () => {
      setConnected(true);
      socket.emit('join-channel', channelName);
    });

    socket.on('disconnect', () => setConnected(false));

    socket.on('queue-update', (data: QueueState) => setQueue(data));
    socket.on('teams-update', (data: TeamsState) => setTeams(data));

    return () => {
      socket.emit('leave-channel', channelName);
      socket.disconnect();
    };
  }, [channelName]);

  return { queue, teams, connected, setQueue, setTeams };
}
