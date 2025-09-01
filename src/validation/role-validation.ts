import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prismaClient } from '../config/database';
import { ResponseError } from '../config/response-error';
import { RoleService } from '../service/role-service';

const baseSchema = z.object({
  name: z
    .string({ message: `The name is required!` })
    .min(1, `The name is required!`),
});

export const validateStoreRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = baseSchema.parse(req.body);

    const roleNameExist = await prismaClient.role.findFirst({
      where: {
        name: payload.name,
      },
    });

    if (roleNameExist) {
      return next(new ResponseError(400, ['The name cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateUpdateRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const payload = baseSchema.parse(req.body);

    const dataExist = await RoleService.detail(parseInt(req.params.id));

    if (!dataExist)
      return next(new ResponseError(404, ['The role does not exist!']));

    const roleNameExist = await prismaClient.role.findFirst({
      where: {
        AND: [{ name: payload.name }, { id: { not: parseInt(req.params.id) } }],
      },
    });

    if (roleNameExist) {
      return next(new ResponseError(400, ['The name cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateDeleteRole = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const dataExist = await RoleService.detail(parseInt(req.params.id));

    if (!dataExist)
      return next(new ResponseError(404, ['The role does not exist!']));

    const relationUserExist = await prismaClient.user.findFirst({
      where: {
        role_id: parseInt(req.params.id),
      },
    });

    // if (relationUserExist) {
    //   return next(
    //     new ResponseError(400, [
    //       "The role couldn't be deleted, because this role is relation with user!",
    //     ])
    //   );
    // }

    next();
  } catch (e) {
    next(e);
  }
};
