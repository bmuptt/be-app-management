import express from 'express';
import {
  validateChangeParent,
  validateDeleteMenu,
  validateHardDeleteMenu,
  validateSortMenu,
  validateStoreMenu,
  validateUpdateMenu,
} from '../../validation/menu-validation';
import { MenuController } from '../../controller/menu-controller';

export const menuRouter = express.Router();

// MENU ROUTES
menuRouter.get('/structure', MenuController.getMenuStructure);
menuRouter.get('/:id', MenuController.index);
menuRouter.get('/:id/detail', MenuController.detail);
menuRouter.get('/:id/list-header', MenuController.listHeader);
menuRouter.post('/', validateStoreMenu, MenuController.store);
menuRouter.post('/sort/:id', validateSortMenu, MenuController.sort);
menuRouter.post(
  '/change-parent/:id',
  validateChangeParent,
  MenuController.changeParent,
);
menuRouter.patch('/:id', validateUpdateMenu, MenuController.update);
menuRouter.delete('/:id', validateDeleteMenu, MenuController.destroy);
menuRouter.delete('/:id/hard', validateHardDeleteMenu, MenuController.hardDelete);
menuRouter.put('/active/:id', validateDeleteMenu, MenuController.active);
