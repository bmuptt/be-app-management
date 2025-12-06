import { NextFunction, Request, Response } from 'express';
import { UserService } from '../service/user-service';
import { ResponseError } from '../config/response-error';
import { prismaClient } from '../config/database';

export class UserController {
  static async index(req: Request, res: Response, next: NextFunction) {
    try {
      if (!req.user) {
        return next(new ResponseError(401, ['Unauthorized!']));
      }

      const data = await UserService.index(req.query, req.user);

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
      const data = await UserService.detail(
        prismaClient,
        parseInt(req.params.id),
      );

      if (!data) {
        return next(new ResponseError(404, ['The user does not exist!']));
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
      const { user, ...dataRequest } = req.body;
      const data = await UserService.store({
        ...dataRequest,
        user: req.user,
      });

      res.status(200).json({
        message: 'Success to add data user.',
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

      const data = await UserService.update(
        parseInt(req.params.id),
        req.body,
        req.user,
      );

      res.status(200).json({
        message: 'Success to edit data user.',
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async resetPassword(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.resetPassword(parseInt(req.params.id));
      res.status(200).json({
        message: 'Success to reset password user.',
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async takeOut(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await UserService.takeOut(parseInt(req.params.id));
      res.status(200).json({
        message: 'Success to reset password user.',
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async getEmailsByIds(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const ids: number[] = res.locals.userIds || [];
      const data = await UserService.getEmailsByIds(ids);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  }

  static async getDetailsByIds(
    req: Request,
    res: Response,
    next: NextFunction,
  ) {
    try {
      const ids: number[] = res.locals.userIds || [];
      const data = await UserService.getDetailsByIds(ids);

      res.status(200).json({
        success: true,
        data,
      });
    } catch (e) {
      next(e);
    }
  }
}
