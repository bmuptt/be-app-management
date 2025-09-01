import { PrismaClient, Prisma } from '@prisma/client';
import {
  IUserObject,
  IUserObjectWithoutPassword,
} from '../../model/user-model';
import { IAccessTokenResponse } from '../../model/accessToken-model';
import { IAccessTokenBasic } from '../../model/auth-model';

export interface IAccessTokenRepository {
  findUniqueByRefreshToken(
    prisma: PrismaClient,
    refreshToken: string,
  ): Promise<IAccessTokenBasic | null>;
  create(
    prisma: PrismaClient | Prisma.TransactionClient,
    user: IUserObject | IUserObjectWithoutPassword,
    token: string,
    refreshToken: string,
  ): Promise<IAccessTokenResponse>;
  deleteByRefreshToken(
    prisma: PrismaClient | Prisma.TransactionClient,
    refreshToken: string,
  ): Promise<void>;
  deleteByToken(
    prisma: PrismaClient | Prisma.TransactionClient,
    token: string,
  ): Promise<void>;
}
