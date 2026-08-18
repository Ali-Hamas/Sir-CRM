import { io, Socket } from 'socket.io-client';

let socket: Socket | null = null;

export function getSocket(userId?: string): Socket | null {
  if (typeof window === 'undefined') return null;

  if (!socket && userId) {
    const wsUrl =
      process.env.NEXT_PUBLIC_WS_URL ||
      process.env.NEXT_PUBLIC_API_URL ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);

    socket = io(wsUrl, {
      query: { userId },
      auth: { userId },
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 2000,
      autoConnect: true,
    });

    socket.on('connect', () => {
      console.log('[WebSocket] Connected with socket ID:', socket?.id);
      socket?.emit('authenticate', { userId });
    });

    socket.on('disconnect', (reason: string) => {
      console.log('[WebSocket] Disconnected:', reason);
    });

    socket.on('connect_error', (error: Error) => {
      console.warn('[WebSocket] Connection error:', error.message);
    });
  }

  return socket;
}

export function disconnectSocket() {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}
