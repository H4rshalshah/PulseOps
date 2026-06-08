import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    const wsUrl = process.env.NEXT_PUBLIC_WS_URL || 'ws://localhost:3001';
    socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected:', socket?.id);
    });

    socket.on('disconnect', (reason) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WebSocket] Connection error:', error.message);
    });
  }
  return socket;
}

export function subscribeToIncident(incidentId: string): Socket {
  const s = getSocket();
  s.emit('incident:subscribe', incidentId);
  return s;
}

export function unsubscribeFromIncident(incidentId: string): void {
  const s = getSocket();
  s.emit('incident:unsubscribe', incidentId);
}

export function subscribeToDashboard(): Socket {
  const s = getSocket();
  s.emit('dashboard:subscribe');
  return s;
}

export function disconnectSocket(): void {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}

export { io };
export type { Socket };
