import express from 'express';
import { validateDeleteRole, validateStoreRole, validateUpdateRole } from '../../validation/role-validation';
import { RoleController } from '../../controller/role-controller';

export const roleRouter = express.Router();

// ROLE ROUTES
roleRouter.get('/', RoleController.index);
roleRouter.get('/:id', RoleController.detail);
roleRouter.post('/', validateStoreRole, RoleController.store);
roleRouter.patch('/:id', validateUpdateRole, RoleController.update);
roleRouter.delete('/:id', validateDeleteRole, RoleController.destroy);
