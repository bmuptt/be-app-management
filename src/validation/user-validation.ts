import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prismaClient } from '../config/database';
import { ResponseError } from '../config/response-error';
import { UserService } from '../service/user-service';

const baseSchema = z.object({
  email: z
    .string({ message: `The email is required!` })
    .email()
    .min(1, `The email is required!`),
  name: z
    .string({ message: `The name is required!` })
    .min(1, `The name is required!`),
  gender: z
    .string({ message: `The gender is required!` })
    .min(1, `The gender is required!`),
  birthdate: z
    .string({ message: `The birthdate is required!` })
    .date(`The birthdate format must be: YYYY-MM-DD!`),
  role_id: z
    .number({ message: `The role is required!` })
    .min(1, `The role is required!`),
  // .min(1, `The birthdate is required!`)
  // .regex(/^\d{4}-\d{2}-\d{2}$/, 'The birthdate format must be: YYYY-MM-DD!'),
});

export const validateStoreUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    baseSchema.parse(req.body);

    const emailExist = await UserService.detailFromEmail(req.body.email);

    if (emailExist) {
      return next(new ResponseError(400, ['The email cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateUpdateUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    baseSchema.parse(req.body);

    const userExist = await UserService.detail(
      prismaClient,
      parseInt(req.params.id),
    );

    if (!userExist) {
      return next(new ResponseError(404, ['The user does not exist!']));
    }

    const emailExist = await UserService.detailFromEmail(
      req.body.email,
      parseInt(req.params.id),
    );

    if (emailExist) {
      return next(new ResponseError(400, ['The email cannot be the same!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};

export const validateResetPasswordUser = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const userExist = await UserService.detail(
      prismaClient,
      parseInt(req.params.id),
    );

    if (!userExist) {
      return next(new ResponseError(404, ['The user does not exist!']));
    }

    next();
  } catch (e) {
    next(e);
  }
};
