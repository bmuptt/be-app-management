import express from 'express';
import { baseRouter } from './base-api';
import { setupSwagger } from '../config/swagger';
// import { appManagementRouter } from './app-management-api';

export const mainRouter = express.Router();

mainRouter.use('/api', baseRouter);

// Export function to setup Swagger on the main Express app
export const setupSwaggerOnApp = (app: express.Express) => {
  setupSwagger(app);
};
