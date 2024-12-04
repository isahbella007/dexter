import { logger } from './utils/helpers/logger';
import { handleSignals } from './utils/helpers/gracefulShutdown';
import { config } from './config';
import app from './app';

const startServer = async () => {
  try {
    console.log('we called the port')
    const server = app.listen(config.port, () => {
      logger.info(`Server running on port http://localhost:${config.port}`);
    });
    handleSignals(server);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
