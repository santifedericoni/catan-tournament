import { useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuthStore } from '../store/auth.store';
import type { TournamentEvent } from '@catan/shared';

type EventCallback = (data: unknown) => void;

export function useSocket(tournamentId: string | undefined) {
  const socketRef = useRef<Socket | null>(null);
  const listenersRef = useRef<Map<string, EventCallback>>(new Map());
  const accessToken = useAuthStore((s) => s.accessToken);

  useEffect(() => {
    if (!tournamentId) return;

    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001';
    const socket = io(`${apiUrl}/events`, {
      auth: { token: accessToken },
      transports: ['polling', 'websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 10000,
    });

    socket.on('connect', () => {
      socket.emit('join-tournament', tournamentId);
      // Re-register all listeners
      for (const [event, cb] of listenersRef.current.entries()) {
        socket.on(event, cb);
      }
    });

    socketRef.current = socket;

    return () => {
      socket.emit('leave-tournament', tournamentId);
      socket.disconnect();
      socketRef.current = null;
    };
  }, [tournamentId, accessToken]);

  const on = useCallback((event: TournamentEvent | string, callback: EventCallback) => {
    listenersRef.current.set(event, callback);
    if (socketRef.current?.connected) {
      socketRef.current.on(event, callback);
    }
    return () => {
      listenersRef.current.delete(event);
      socketRef.current?.off(event, callback);
    };
  }, []);

  return { on, socket: socketRef.current };
}
