import express from 'express';
import { baseRouter } from './base-api';
// import { appManagementRouter } from './app-management-api';

export const mainRouter = express.Router();
mainRouter.use('/api', baseRouter);
