import { Prisma } from '@prisma/client';
import { PrismaClientType } from '../../config/database';
import {
  IUserObject,
  IUserObjectWithoutPassword,
} from '../../model/user-model';
import { IAccessTokenResponse } from '../../model/accessToken-model';
import { IAccessTokenRepository } from '../contract/access-token-repository.contract';
import { IAccessTokenBasic } from '../../model/auth-model';

export class AccessTokenRepository implements IAccessTokenRepository {
  async findUniqueByRefreshToken(
    prisma: PrismaClientType,
    refreshToken: string,
  ): Promise<IAccessTokenBasic | null> {
    return await prisma.accessToken.findUnique({
      where: {
        refresh_token: refreshToken,
      },
    });
  }

  async create(
    prisma: PrismaClientType,
    user: IUserObject | IUserObjectWithoutPassword,
    token: string,
    refreshToken: string,
  ): Promise<IAccessTokenResponse> {
    await prisma.accessToken.create({
      data: {
        token,
        refresh_token: refreshToken,
        user_id: user.id,
      },
    });

    return {
      token,
      refresh_token: refreshToken,
    };
  }

  async deleteByRefreshToken(
    prisma: PrismaClientType,
    refreshToken: string,
  ): Promise<void> {
    await prisma.accessToken.delete({
      where: {
        refresh_token: refreshToken,
      },
    });
  }

  async deleteByToken(
    prisma: PrismaClientType,
    token: string,
  ): Promise<void> {
    await prisma.accessToken.deleteMany({
      where: {
        token,
      },
    });
  }
}
