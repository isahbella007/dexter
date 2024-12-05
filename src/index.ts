import { logger } from './utils/helpers/logger';
import { handleSignals } from './utils/helpers/gracefulShutdown';
import { config } from './config';
import app from './app';

const startServer = async () => {
  try {
    console.log('we called the port')
    const port = config.port || 3000;
    const server = app.listen(port, () => {
      logger.info(`Server running on port http://localhost:${port}`);
    });
    handleSignals(server);
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();
