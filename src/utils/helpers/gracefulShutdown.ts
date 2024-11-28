import { Server, Socket } from 'net';
import { logger } from './logger';

let server: Server | undefined;
const connections = new Set<Socket>();

const gracefulShutdown = async (signal: string): Promise<void> => {
  try {
    logger.info(`Received ${signal}. Gracefully shutting down...`);

    // Stop accepting new connections
    if (server) {
      server.close(() => {
        logger.info('Server closed.');
      });
    }

    // Allow ongoing requests to complete
    for (const conn of connections) {
      conn.end();
    }
    // cacheService.disconnect();

    process.exit(0);
  } catch (error) {
    logger.error('Error during shutdown:', error);
    process.exit(1);
  }
};

const handleSignals = (instance: Server): void => {
  server = instance;

  process.on('SIGINT', () => gracefulShutdown('SIGINT'));
  process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  server.on('connection', (conn: Socket) => {
    connections.add(conn);
    conn.on('close', () => connections.delete(conn));
  });
};

export { handleSignals };
