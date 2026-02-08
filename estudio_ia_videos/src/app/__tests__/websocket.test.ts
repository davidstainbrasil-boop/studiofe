/**
 * @jest-environment node
 */
/**
 * Testes Unitários - WebSocket Server (sem bind de porta)
 *
 * O sandbox de testes pode bloquear `server.listen()`. Estes testes validam a
 * lógica de middleware/eventos do `initializeWebSocket` usando mocks de Socket.IO.
 */

import { createServer } from 'http';
import { initializeWebSocket, TimelineEvent } from '@lib/websocket/timeline-websocket';
import { logger } from '@lib/logger';

jest.mock('@lib/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

// Mock authentication
jest.mock('@lib/auth/jwt', () => ({
  verifyJWT: jest.fn((token: string) => {
    if (token === 'token-user-1') {
      return { sub: 'user_1', user_metadata: { full_name: 'User 1' } };
    }
    if (token === 'token-user-2') {
      return { sub: 'user_2', user_metadata: { full_name: 'User 2' } };
    }
    return null;
  }),
}));

jest.mock('socket.io', () => {
  class Server {
    middleware?: (socket: unknown, next: (err?: Error) => void) => void;
    connectionHandler?: (socket: unknown) => void;
    toEmit = jest.fn();
    close = jest.fn();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    constructor(_server: unknown, _options: unknown) {}

    use(fn: (socket: unknown, next: (err?: Error) => void) => void) {
      this.middleware = fn;
    }

    on(event: string, handler: (socket: unknown) => void) {
      if (event === 'connection') {
        this.connectionHandler = handler;
      }
    }

    to(room: string) {
      return {
        emit: (event: string, payload: unknown) => {
          this.toEmit(room, event, payload);
        },
      };
    }
  }

  return { Server, Socket: class Socket {} };
});

function createMockSocket(id: string, token?: string) {
  const handlers = new Map<string, (data?: any) => void>();
  const toEmit = jest.fn();

  const socket: any = {
    id,
    handshake: { auth: token ? { token } : {} },
    data: {},
    join: jest.fn(),
    leave: jest.fn(),
    emit: jest.fn(),
    to: jest.fn((room: string) => ({
      emit: (event: string, payload: unknown) => toEmit(room, event, payload),
    })),
    on: jest.fn((event: string, cb: (data?: any) => void) => {
      handlers.set(event, cb);
    }),
  };

  return { socket, handlers, toEmit };
}

describe('WebSocket Server - Testes Unitários', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('deve rejeitar conexão sem token', async () => {
    const io = initializeWebSocket(createServer()) as any;
    const { socket } = createMockSocket('socket-1');
    const next = jest.fn();

    await io.middleware(socket, next);

    expect(logger.warn).toHaveBeenCalledWith(
      'Connection attempt without token',
      expect.objectContaining({ socketId: 'socket-1' }),
    );
    expect(next).toHaveBeenCalledWith(expect.any(Error));
    expect((next.mock.calls[0][0] as Error).message).toBe('Authentication required');
  });

  it('deve popular socket.data com token válido', async () => {
    const io = initializeWebSocket(createServer()) as any;
    const { socket } = createMockSocket('socket-1', 'token-user-1');
    const next = jest.fn();

    await io.middleware(socket, next);

    expect(next).toHaveBeenCalledWith();
    expect(socket.data.userId).toBe('user_1');
    expect(socket.data.userName).toBe('User 1');
  });

  it('deve emitir USER_JOINED e ACTIVE_USERS ao entrar no projeto', async () => {
    const io = initializeWebSocket(createServer()) as any;
    const { socket, handlers, toEmit } = createMockSocket('socket-1', 'token-user-1');
    const next = jest.fn();

    await io.middleware(socket, next);
    io.connectionHandler(socket);

    handlers.get(TimelineEvent.JOIN_PROJECT)?.({ projectId: 'proj_test_1' });

    expect(socket.join).toHaveBeenCalledWith('project:proj_test_1');
    expect(socket.emit).toHaveBeenCalledWith(
      TimelineEvent.USER_JOINED,
      expect.objectContaining({
        userId: 'user_1',
        userName: 'User 1',
        projectId: 'proj_test_1',
      }),
    );
    expect(socket.emit).toHaveBeenCalledWith(
      TimelineEvent.ACTIVE_USERS,
      expect.objectContaining({
        projectId: 'proj_test_1',
        count: 1,
        users: expect.arrayContaining(['user_1']),
      }),
    );
    expect(toEmit).toHaveBeenCalledWith(
      'project:proj_test_1',
      TimelineEvent.USER_JOINED,
      expect.objectContaining({ userId: 'user_1' }),
    );
  });

  it('ACTIVE_USERS deve incluir todos usuários conectados', async () => {
    const io = initializeWebSocket(createServer()) as any;

    const socket1 = createMockSocket('socket-1', 'token-user-1');
    const socket2 = createMockSocket('socket-2', 'token-user-2');
    const next1 = jest.fn();
    const next2 = jest.fn();

    await io.middleware(socket1.socket, next1);
    io.connectionHandler(socket1.socket);
    socket1.handlers.get(TimelineEvent.JOIN_PROJECT)?.({ projectId: 'proj_test_1' });

    await io.middleware(socket2.socket, next2);
    io.connectionHandler(socket2.socket);
    socket2.handlers.get(TimelineEvent.JOIN_PROJECT)?.({ projectId: 'proj_test_1' });

    const call = socket2.socket.emit.mock.calls.find((c: unknown[]) => c[0] === TimelineEvent.ACTIVE_USERS);
    expect(call).toBeDefined();
    expect(call?.[1]).toEqual(
      expect.objectContaining({
        projectId: 'proj_test_1',
        count: 2,
        users: expect.arrayContaining(['user_1', 'user_2']),
      }),
    );
  });

  it('TIMELINE_UPDATED deve broadcast update + NOTIFICATION', async () => {
    const io = initializeWebSocket(createServer()) as any;
    const { socket, handlers, toEmit } = createMockSocket('socket-1', 'token-user-1');
    const next = jest.fn();

    await io.middleware(socket, next);
    io.connectionHandler(socket);
    handlers.get(TimelineEvent.JOIN_PROJECT)?.({ projectId: 'proj_test_1' });

    handlers.get(TimelineEvent.TIMELINE_UPDATED)?.({
      projectId: 'proj_test_1',
      timeline: { foo: 'bar' },
    });

    expect(toEmit).toHaveBeenCalledWith('project:proj_test_1', TimelineEvent.TIMELINE_UPDATED, { foo: 'bar' });
    expect(io.toEmit).toHaveBeenCalledWith(
      'project:proj_test_1',
      TimelineEvent.NOTIFICATION,
      expect.objectContaining({
        type: 'success',
        projectId: 'proj_test_1',
        message: 'Timeline salva com sucesso',
      }),
    );
  });
});

