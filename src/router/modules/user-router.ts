import express from 'express';
import { validateResetPasswordUser, validateStoreUser, validateUpdateUser } from '../../validation/user-validation';
import { UserController } from '../../controller/user-controller';

export const userRouter = express.Router();

// USER ROUTES
userRouter.get('/', UserController.index);
userRouter.get('/:id', UserController.detail);
userRouter.post('/', validateStoreUser, UserController.store);
userRouter.patch('/:id', validateUpdateUser, UserController.update);
userRouter.post('/reset-password/:id', validateResetPasswordUser, UserController.resetPassword);
userRouter.post('/take-out/:id', validateResetPasswordUser, UserController.takeOut);
