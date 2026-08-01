import { randomUUID } from 'node:crypto';
import { connect, type Socket } from 'node:net';
import { discordApplicationId } from './discordConfig.js';

const discordIpcVersion = 1;
const reconnectDelayMs = 30_000;
const sessionStartedAt = Math.floor(Date.now() / 1_000);
let activeSocket: Socket | null = null;
let reconnectTimer: NodeJS.Timeout | null = null;
let stopping = false;

export function startDiscordPresence() {
  if (process.platform !== 'win32' || !isDiscordApplicationConfigured()) return;
  stopping = false;
  void connectToDiscord();
}

export function stopDiscordPresence() {
  stopping = true;
  if (reconnectTimer) clearTimeout(reconnectTimer);
  reconnectTimer = null;
  activeSocket?.destroy();
  activeSocket = null;
}

export function encodeDiscordFrame(opcode: number, payload: unknown) {
  const body = Buffer.from(JSON.stringify(payload), 'utf8');
  const header = Buffer.alloc(8);
  header.writeInt32LE(opcode, 0);
  header.writeInt32LE(body.length, 4);
  return Buffer.concat([header, body]);
}

export function decodeDiscordFrames(buffer: Buffer) {
  const frames: Array<{ opcode: number; payload: Record<string, unknown> }> = [];
  let offset = 0;

  while (buffer.length - offset >= 8) {
    const opcode = buffer.readInt32LE(offset);
    const length = buffer.readInt32LE(offset + 4);
    if (length < 0 || buffer.length - offset - 8 < length) break;

    const body = buffer.subarray(offset + 8, offset + 8 + length).toString('utf8');
    try {
      frames.push({ opcode, payload: JSON.parse(body) as Record<string, unknown> });
    } catch {
      // O Discord fecha conexões com payload inválido. Ignoramos somente o quadro corrompido.
    }
    offset += 8 + length;
  }

  return { frames, remaining: buffer.subarray(offset) };
}

async function connectToDiscord() {
  if (stopping || activeSocket) return;

  for (let index = 0; index < 10; index += 1) {
    const socket = await openDiscordPipe(`\\\\?\\pipe\\discord-ipc-${index}`);
    if (!socket) continue;

    activeSocket = socket;
    attachDiscordSocket(socket);
    socket.write(
      encodeDiscordFrame(0, {
        client_id: discordApplicationId,
        v: discordIpcVersion,
      }),
    );
    return;
  }

  scheduleReconnect();
}

function openDiscordPipe(path: string) {
  return new Promise<Socket | null>((resolve) => {
    const socket = connect(path);
    let settled = false;

    socket.once('connect', () => {
      settled = true;
      resolve(socket);
    });
    socket.once('error', () => {
      if (!settled) resolve(null);
      socket.destroy();
    });
  });
}

function attachDiscordSocket(socket: Socket) {
  let pending: Buffer<ArrayBufferLike> = Buffer.alloc(0);

  socket.on('data', (chunk) => {
    const bytes = typeof chunk === 'string' ? Buffer.from(chunk, 'utf8') : chunk;
    pending = Buffer.concat([pending, bytes]);
    const decoded = decodeDiscordFrames(pending);
    pending = decoded.remaining;

    for (const frame of decoded.frames) {
      if (frame.payload.cmd === 'DISPATCH' && frame.payload.evt === 'READY') {
        socket.write(encodeDiscordFrame(1, createActivityPayload()));
      }
    }
  });

  socket.once('close', () => {
    if (activeSocket === socket) activeSocket = null;
    scheduleReconnect();
  });
}

function createActivityPayload() {
  return {
    args: {
      activity: {
        details: 'Conversando no Crypt',
        state: 'Comunidades, mensagens e chamadas',
        timestamps: { start: sessionStartedAt },
        type: 0,
      },
      pid: process.pid,
    },
    cmd: 'SET_ACTIVITY',
    nonce: randomUUID(),
  };
}

function isDiscordApplicationConfigured() {
  return /^\d{17,20}$/.test(discordApplicationId);
}

function scheduleReconnect() {
  if (stopping || reconnectTimer) return;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    void connectToDiscord();
  }, reconnectDelayMs);
  reconnectTimer.unref();
}
