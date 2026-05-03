import { SOCKET, SOCKET_TYPE } from "./constants.mjs";

const handlers = new Map();

export function registerHandler(type, fn) {
  handlers.set(type, fn);
}

export function emit(payload) {
  if (!game?.ready) return;
  if (game.socket) game.socket.emit(SOCKET, payload);
  dispatch(payload);
}

export function dispatch(payload) {
  const fn = handlers.get(payload?.type);
  if (fn) fn(payload);
}

export function installSocketListener() {
  game.socket.on(SOCKET, dispatch);
}

export { SOCKET_TYPE };
