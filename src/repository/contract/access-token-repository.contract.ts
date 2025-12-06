import { Prisma } from '@prisma/client';
import { PrismaClientType } from '../../config/database';
import {
  IUserObject,
  IUserObjectWithoutPassword,
} from '../../model/user-model';
import { IAccessTokenResponse } from '../../model/accessToken-model';
import { IAccessTokenBasic } from '../../model/auth-model';

export interface IAccessTokenRepository {
  findUniqueByRefreshToken(
    prisma: PrismaClientType,
    refreshToken: string,
  ): Promise<IAccessTokenBasic | null>;
  create(
    prisma: PrismaClientType,
    user: IUserObject | IUserObjectWithoutPassword,
    token: string,
    refreshToken: string,
  ): Promise<IAccessTokenResponse>;
  deleteByRefreshToken(
    prisma: PrismaClientType,
    refreshToken: string,
  ): Promise<void>;
  deleteByToken(
    prisma: PrismaClientType,
    token: string,
  ): Promise<void>;
}
