import express from 'express';
import { userRouter } from './modules/user-router';
import { roleRouter } from './modules/role-router';
import { menuRouter } from './modules/menu-router';
import { roleMenuRouter } from './modules/role-menu-router';

export const appManagementRouter = express.Router();

// Mount module routers
appManagementRouter.use('/user', userRouter);
appManagementRouter.use('/role', roleRouter);
appManagementRouter.use('/menu', menuRouter);
appManagementRouter.use('/role-menu', roleMenuRouter);
