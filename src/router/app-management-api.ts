import express from 'express';
import { validateResetPasswordUser, validateStoreUser, validateUpdateUser } from '../validation/user-validation';
import { UserController } from '../controller/user-controller';
import { validateDeleteRole, validateStoreRole, validateUpdateRole } from '../validation/role-validation';
import { RoleController } from '../controller/role-controller';
import { MenuController } from '../controller/menu-controller';
import { validateChangeParent, validateDeleteMenu, validateSortMenu, validateStoreMenu, validateUpdateMenu } from '../validation/menu-validation';
import { RoleMenuController } from '../controller/role-menu-controller';

export const appManagementRouter = express.Router();

// USER
appManagementRouter.get('/user', UserController.index);
appManagementRouter.get('/user/:id', UserController.detail);
appManagementRouter.post('/user', validateStoreUser, UserController.store);
appManagementRouter.patch('/user/:id', validateUpdateUser, UserController.update);
appManagementRouter.post('/user/reset-password/:id', validateResetPasswordUser, UserController.resetPassword);
appManagementRouter.post('/user/take-out/:id', validateResetPasswordUser, UserController.takeOut);

// ROLE
appManagementRouter.get('/role', RoleController.index);
appManagementRouter.get('/role/:id', RoleController.detail);
appManagementRouter.post('/role', validateStoreRole, RoleController.store);
appManagementRouter.patch('/role/:id', validateUpdateRole, RoleController.update);
appManagementRouter.delete('/role/:id', validateDeleteRole, RoleController.destroy);

// MENU
appManagementRouter.get('/menu/:id', MenuController.index);
appManagementRouter.get('/menu/:id/detail', MenuController.detail);
appManagementRouter.get('/menu/:id/list-header', MenuController.listHeader);
appManagementRouter.get('/menu-structure', MenuController.getMenuStructure);
appManagementRouter.post('/menu', validateStoreMenu, MenuController.store);
appManagementRouter.post('/menu/sort/:id', validateSortMenu, MenuController.sort);
appManagementRouter.post('/menu/change-parent/:id', validateChangeParent, MenuController.changeParent);
appManagementRouter.patch('/menu/:id', validateUpdateMenu, MenuController.update);
appManagementRouter.delete('/menu/:id', validateDeleteMenu, MenuController.destroy);
appManagementRouter.put('/menu/active/:id', validateDeleteMenu, MenuController.active);

// ROLE MENU
appManagementRouter.get('/role-menu/:role_id', RoleMenuController.index);
appManagementRouter.post('/role-menu/:role_id', RoleMenuController.store);
