import { NextFunction, Request, Response } from 'express';
import { ResponseError } from '../config/response-error';
import { RoleService } from '../service/role-service';

export class RoleController {
  static async index(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new ResponseError(401, ['Unauthorized!']));
      }

      const data = await RoleService.index(req.query, req.user);

      res.status(200).json({
        ...data,
        page: parseInt(req.query.page as string) || 1,
      });
    } catch (e) {
      next(e);
    }
  }

  static async detail(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await RoleService.detail(parseInt(req.params.id));

      if (!data) {
        return next(new ResponseError(404, ['The role does not exist!']));
      }

      res.status(200).json({
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async store(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new ResponseError(401, ['Unauthorized!']));
      }

      const data = await RoleService.store(req.body, req.user);

      res.status(200).json({
        message: 'Success to add data role.',
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async update(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new ResponseError(401, ['Unauthorized!']));
      }

      const data = await RoleService.update(parseInt(req.params.id), req.body, req.user)

      res.status(200).json({
        message: 'Success to edit data role.',
        data
      });
    } catch (e) {
      next(e);
    }
  }

  static async destroy(req: Request, res: Response, next: NextFunction) {
    try {

      const data = await RoleService.destroy(parseInt(req.params.id))

      res.status(200).json({
        message: 'Success to delete data role.',
        data
      });
    } catch (e) {
      next(e);
    }
  }
}
