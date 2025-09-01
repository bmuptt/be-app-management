import { NextFunction, Request, Response } from 'express';
import { ResponseError } from '../config/response-error';
import { RoleMenuService } from '../service/role-menu-service';
import { RoleService } from '../service/role-service';

export class RoleMenuController {
  static async index(req: Request, res: Response, next: NextFunction) {
    try {
      const role_id = parseInt(req.params.role_id);

      const dataRole = await RoleService.detail(role_id);
      if (!dataRole) {
        return next(new ResponseError(404, ['The role does not exist!']));
      }

      const data = await RoleMenuService.index(role_id);

      res.status(200).json({
        ...data,
      });
    } catch (error) {
      next(error);
    }
  }

  static async store(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RoleMenuService.store(
        parseInt(req.params.role_id),
        req.body,
      );

      res.status(200).json({
        message: 'Success to config role menu.',
        data,
      });
    } catch (e) {
      if (e instanceof Error && 'code' in e && e.code === 'P2025') {
        next(new ResponseError(404, ['Role or Menu not found!']));

        return;
      }
      next(e);
    }
  }
}
