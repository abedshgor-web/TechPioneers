import { PrismaClient } from './generated/client/index.js';

declare global {
  // eslint-disable-next-line no-var
  var __prismaClient: PrismaClient | undefined;
}

export function createPrismaClient(): PrismaClient {
  return new PrismaClient({
    log:
      process.env['NODE_ENV'] === 'development'
        ? ['query', 'info', 'warn', 'error']
        : ['warn', 'error'],
  });
}

export function getPrismaClient(): PrismaClient {
  if (process.env['NODE_ENV'] === 'production') {
    return createPrismaClient();
  }
  if (!global.__prismaClient) {
    global.__prismaClient = createPrismaClient();
  }
  return global.__prismaClient;
}
