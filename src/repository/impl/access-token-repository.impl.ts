import { PrismaClient, Prisma } from '@prisma/client';
import { IUserObject, IUserObjectWithoutPassword } from '../../model/user-model';
import { IAccessTokenResponse } from '../../model/accessToken-model';
import { IAccessTokenRepository } from '../contract/access-token-repository.contract';
import { IAccessTokenBasic } from '../../model/auth-model';

export class AccessTokenRepository implements IAccessTokenRepository {
  async findUniqueByRefreshToken(prisma: PrismaClient, refreshToken: string): Promise<IAccessTokenBasic | null> {
    return await prisma.accessToken.findUnique({
      where: {
        refresh_token: refreshToken
      }
    });
  }

  async create(prisma: PrismaClient | Prisma.TransactionClient, user: IUserObject | IUserObjectWithoutPassword, token: string, refreshToken: string): Promise<IAccessTokenResponse> {
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

  async deleteByRefreshToken(prisma: PrismaClient | Prisma.TransactionClient, refreshToken: string): Promise<void> {
    await prisma.accessToken.delete({
      where: {
        refresh_token: refreshToken,
      },
    });
  }

  async deleteByToken(prisma: PrismaClient | Prisma.TransactionClient, token: string): Promise<void> {
    await prisma.accessToken.deleteMany({
      where: {
        token,
      },
    });
  }
}
