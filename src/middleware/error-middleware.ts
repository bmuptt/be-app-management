import { Response, Request, NextFunction } from 'express';
import { ZodError } from 'zod';
import { ResponseError } from '../config/response-error';
import { AccessTokenService } from '../service/accessToken-service';
import { prismaClient } from '../config/database';

export const errorMiddleware = async (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (error instanceof ZodError) {
    const dataError = error.errors.map((issue) => issue.message);

    res.status(400).json({
      errors: dataError,
    });
  } else if (error instanceof ResponseError) {
    if (error.status === 403) {
      const token = req.cookies.token;

      if (token) {
        AccessTokenService.destroyByToken(prismaClient, token)
      }
    }

    res.status(error.status).json({
      errors: [error.message],
    });
  } else {
    res.status(500).json({
      errors: [error.message],
    });
  }
};
