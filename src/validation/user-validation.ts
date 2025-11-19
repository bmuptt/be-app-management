import { NextFunction, Request, Response } from 'express';
import { z } from 'zod';
import { prismaClient } from '../config/database';
import { ResponseError } from '../config/response-error';
import { UserService } from '../service/user-service';

const getUserEmailsQuerySchema = z.object({
  ids: z
    .string({ required_error: 'The ids is required!' })
    .trim()
    .min(1, 'The ids is required!')
    .transform((value) => {
      const uniqueIds = Array.from(
        new Set(
          value
            .split(',')
            .map((id) => id.trim())
            .filter((id) => id.length > 0),
        ),
      );

      return uniqueIds.map((id) => Number(id));
    })
    .refine((ids) => ids.length > 0, {
      message: 'The ids is required!',
    })
    .refine(
      (ids) => ids.every((id) => Number.isInteger(id) && id > 0),
      {
        message: 'The ids must be positive integers!',
      },
    ),
});

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
    .coerce
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
    const validatedData = baseSchema.parse(req.body);
    req.body = validatedData; // Simpan hasil parsing kembali ke req.body

    const emailExist = await UserService.detailFromEmail(req.body.email);

    if (emailExist) {
      return next(new ResponseError(400, ['The email cannot be the same!']));
    }

    // Validasi role_id exists
    const roleExist = await prismaClient.role.findUnique({
      where: { id: req.body.role_id }
    });

    if (!roleExist) {
      return next(new ResponseError(400, ['The role is not found!']));
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

export const validateGetUserEmails = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  try {
    const { ids } = getUserEmailsQuerySchema.parse(req.query);
    res.locals.userIds = ids;

    next();
  } catch (e) {
    next(e);
  }
};
