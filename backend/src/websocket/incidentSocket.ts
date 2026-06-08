import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';

let io: SocketIOServer | null = null;

export function initSocket(httpServer: HTTPServer, corsOrigin: string): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: corsOrigin,
      methods: ['GET', 'POST'],
      credentials: true,
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  io.on('connection', (socket) => {
    console.log(`[WebSocket] Client connected: ${socket.id}`);

    // Join incident-specific room
    socket.on('incident:subscribe', (incidentId: string) => {
      socket.join(`incident:${incidentId}`);
      console.log(`[WebSocket] ${socket.id} subscribed to incident:${incidentId}`);
    });

    // Leave incident-specific room
    socket.on('incident:unsubscribe', (incidentId: string) => {
      socket.leave(`incident:${incidentId}`);
    });

    // Join global dashboard feed
    socket.on('dashboard:subscribe', () => {
      socket.join('dashboard');
    });

    socket.on('disconnect', () => {
      console.log(`[WebSocket] Client disconnected: ${socket.id}`);
    });
  });

  console.log('[WebSocket] Socket.io initialized');
  return io;
}

export function getIO(): SocketIOServer | null {
  return io;
}
