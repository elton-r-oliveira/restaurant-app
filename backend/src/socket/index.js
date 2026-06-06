const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io;

function initSocket(server) {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || '*',
      credentials: true,
    },
  });

  // Autenticação via token no handshake
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error('Token não fornecido'));
    try {
      socket.usuario = jwt.verify(token, process.env.JWT_SECRET);
      next();
    } catch {
      next(new Error('Token inválido'));
    }
  });

  io.on('connection', (socket) => {
    const { restaurante_id, role, nome } = socket.usuario;

    // Cada restaurante tem sua própria room — isolamento multi-tenant
    socket.join(`r_${restaurante_id}`);
    console.log(`[socket] ${nome} (${role}) conectado — restaurante ${restaurante_id}`);

    socket.on('disconnect', () => {
      console.log(`[socket] ${nome} desconectado`);
    });
  });

  return io;
}

function getIO() {
  if (!io) throw new Error('Socket.IO não inicializado');
  return io;
}

module.exports = { initSocket, getIO };
