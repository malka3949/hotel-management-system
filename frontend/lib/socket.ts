import { io, Socket } from 'socket.io-client';

const WS_URL =
  typeof window !== 'undefined'
    ? `${window.location.protocol}//${window.location.hostname}:3001`
    : '';

let socket: Socket | null = null;

export function getSocket(token: string): Socket {
  if (!socket || socket.disconnected) {
    socket = io(`${WS_URL}/ws`, {
      auth: { token },
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 10,
    });
  }
  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
}
