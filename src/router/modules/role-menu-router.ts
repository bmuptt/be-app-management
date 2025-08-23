import express from 'express';
import { RoleMenuController } from '../../controller/role-menu-controller';

export const roleMenuRouter = express.Router();

// ROLE MENU ROUTES
roleMenuRouter.get('/:role_id', RoleMenuController.index);
roleMenuRouter.post('/:role_id', RoleMenuController.store);
