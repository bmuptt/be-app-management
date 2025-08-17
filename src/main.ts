import { logger } from './config/logging';
import { web } from './config/web';

web.listen(3000, () => {
  logger.info('Listening on port 3000');
});
