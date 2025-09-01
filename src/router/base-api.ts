import express from 'express';
import { AuthController } from '../controller/auth-controller';
import {
  validateEditProfile,
  validateLogin,
  validatePermission,
  verifyToken,
} from '../validation/auth-validation';
import { appManagementRouter } from './app-management-api';

export const baseRouter = express.Router();

// LOGIN
baseRouter.post('/login', validateLogin, AuthController.login);
baseRouter.post('/refresh-token', AuthController.refreshToken);
baseRouter.get('/profile', verifyToken, AuthController.profile);
baseRouter.patch(
  '/edit-profile',
  verifyToken,
  validateEditProfile,
  AuthController.editProfile,
);
baseRouter.get(
  '/permission',
  verifyToken,
  validatePermission,
  AuthController.permission,
);
baseRouter.post('/logout', verifyToken, AuthController.logout);

baseRouter.use('/app-management', verifyToken, appManagementRouter);
