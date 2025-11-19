// Add this to the very top of the first file loaded in your app
import 'dotenv/config';
import './config/apm';

import { logger } from './config/logging';
import { web } from './config/web';

// Start server (skip in testing environment to avoid conflicts and speed up tests)
let server: any = null;
if (process.env.NODE_ENV !== 'testing') {
  const PORT = process.env.PORT || 3000;
  
  server = web.listen(PORT, () => {
    logger.info(`Listening on port ${PORT}`);
    logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export server for testing cleanup
export { server };

// Graceful shutdown
process.on('SIGTERM', () => {
  logger.info('SIGTERM received, shutting down gracefully');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});

process.on('SIGINT', () => {
  logger.info('SIGINT received, shutting down gracefully');
  if (server) {
    server.close(() => {
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
