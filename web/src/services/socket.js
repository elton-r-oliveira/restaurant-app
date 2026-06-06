import { io } from 'socket.io-client';

const URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

let socket = null;

export function conectarSocket() {
  if (socket?.connected) return socket;
  const token = localStorage.getItem('token');
  socket = io(URL, { auth: { token } });
  return socket;
}

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}

export function getSocket() {
  return socket;
}
