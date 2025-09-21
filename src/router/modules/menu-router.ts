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

/**
 * @swagger
 * /api/app-management/menu/structure:
 *   get:
 *     summary: Get menu structure (hierarchical)
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     responses:
 *       200:
 *         description: Menu structure retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Menu'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.get('/structure', MenuController.getMenuStructure);

/**
 * @swagger
 * /api/app-management/menu/{id}:
 *   get:
 *     summary: Get menu list with pagination
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Parent menu ID (use 0 for root level)
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 100
 *           default: 10
 *         description: Number of items per page
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for menu name
 *       - in: query
 *         name: active
 *         schema:
 *           type: string
 *           enum: [Active, Inactive]
 *         description: Filter by menu status
 *     responses:
 *       200:
 *         description: Menu list retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Menu'
 *                 meta:
 *                   $ref: '#/components/schemas/PaginationMeta'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.get('/:id', MenuController.index);

/**
 * @swagger
 * /api/app-management/menu/{id}/detail:
 *   get:
 *     summary: Get menu detail by ID
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu detail retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   $ref: '#/components/schemas/Menu'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.get('/:id/detail', MenuController.detail);

/**
 * @swagger
 * /api/app-management/menu/{id}/list-header:
 *   get:
 *     summary: Get menu breadcrumb headers
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu headers retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Menu'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.get('/:id/list-header', MenuController.listHeader);

/**
 * @swagger
 * /api/app-management/menu:
 *   post:
 *     summary: Create new menu
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key_menu, name, order_number]
 *             properties:
 *               key_menu:
 *                 type: string
 *                 example: "dashboard"
 *               name:
 *                 type: string
 *                 example: "Dashboard"
 *               order_number:
 *                 type: integer
 *                 example: 1
 *               url:
 *                 type: string
 *                 example: "/dashboard"
 *               menu_id:
 *                 type: integer
 *                 example: null
 *     responses:
 *       201:
 *         description: Menu created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu created successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Menu'
 *       400:
 *         description: Validation error or key_menu already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.post('/', validateStoreMenu, MenuController.store);

/**
 * @swagger
 * /api/app-management/menu/sort/{id}:
 *   post:
 *     summary: Sort menu order
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [order_number]
 *             properties:
 *               order_number:
 *                 type: integer
 *                 example: 2
 *     responses:
 *       200:
 *         description: Menu sorted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu sorted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.post('/sort/:id', validateSortMenu, MenuController.sort);

/**
 * @swagger
 * /api/app-management/menu/change-parent/{id}:
 *   post:
 *     summary: Change menu parent
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [menu_id]
 *             properties:
 *               menu_id:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Menu parent changed successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu parent changed successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.post(
  '/change-parent/:id',
  validateChangeParent,
  MenuController.changeParent,
);

/**
 * @swagger
 * /api/app-management/menu/{id}:
 *   patch:
 *     summary: Update menu
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [key_menu, name, order_number]
 *             properties:
 *               key_menu:
 *                 type: string
 *                 example: "dashboard"
 *               name:
 *                 type: string
 *                 example: "Dashboard"
 *               order_number:
 *                 type: integer
 *                 example: 1
 *               url:
 *                 type: string
 *                 example: "/dashboard"
 *               menu_id:
 *                 type: integer
 *                 example: null
 *     responses:
 *       200:
 *         description: Menu updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu updated successfully"
 *                 data:
 *                   $ref: '#/components/schemas/Menu'
 *       400:
 *         description: Validation error or key_menu already exists
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.patch('/:id', validateUpdateMenu, MenuController.update);

/**
 * @swagger
 * /api/app-management/menu/{id}:
 *   delete:
 *     summary: Delete menu (soft delete)
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.delete('/:id', validateDeleteMenu, MenuController.destroy);

/**
 * @swagger
 * /api/app-management/menu/{id}/hard:
 *   delete:
 *     summary: Hard delete menu (permanent)
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu hard deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu hard deleted successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.delete('/:id/hard', validateHardDeleteMenu, MenuController.hardDelete);

/**
 * @swagger
 * /api/app-management/menu/active/{id}:
 *   put:
 *     summary: Toggle menu active status
 *     tags: [Menu Management]
 *     security:
 *       - bearerAuth: []
 *       - cookieAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: Menu ID
 *     responses:
 *       200:
 *         description: Menu status toggled successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: "success"
 *                 message:
 *                   type: string
 *                   example: "Menu status toggled successfully"
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       404:
 *         description: Menu not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 */
menuRouter.put('/active/:id', validateDeleteMenu, MenuController.active);
