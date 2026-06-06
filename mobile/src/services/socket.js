import { io } from 'socket.io-client';
import * as SecureStore from 'expo-secure-store';

const API_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:4000';

let socket = null;

export async function conectarSocket() {
  const token = await SecureStore.getItemAsync('token');
  socket = io(API_URL, { auth: { token }, transports: ['websocket'] });
  return socket;
}

export function getSocket() { return socket; }

export function desconectarSocket() {
  socket?.disconnect();
  socket = null;
}
