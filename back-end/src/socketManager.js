// socketManager.js — Gerencia a instância global do Socket.io
let io = null;

export const setIO = (ioInstance) => {
  io = ioInstance;
};

export const getIO = () => {
  if (!io) throw new Error('Socket.io não inicializado');
  return io;
};

/**
 * Emite um evento para todos os clientes conectados.
 * @param {string} event — nome do evento
 * @param {any} data — payload do evento
 */
export const emitToAll = (event, data) => {
  if (io) io.emit(event, data);
};

/**
 * Emite um evento para uma sala específica (ex: por área ou por userId).
 */
export const emitToRoom = (room, event, data) => {
  if (io) io.to(room).emit(event, data);
};
