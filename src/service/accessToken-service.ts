import { IUserObject } from '../model/user-model';
import {
  generateRefreshToken,
  generateToken,
} from '../validation/auth-validation';
import { IAccessTokenResponse } from '../model/accessToken-model';
import { prismaClient } from '../config/database';
import { PrismaClient, Prisma } from '@prisma/client';

export class AccessTokenService {
  static async detailByRefreshToken(prisma: PrismaClient, refresh_token: string) {
    return await prisma.accessToken.findUnique({
      where: {
        refresh_token
      }
    })
  }

  static async addToken(prisma: PrismaClient | Prisma.TransactionClient, user: IUserObject): Promise<IAccessTokenResponse> {
    const token = generateToken(user);
    const refresh_token = generateRefreshToken();

    await prisma.accessToken.create({
      data: {
        token,
        refresh_token,
        user_id: user.id,
      },
    });

    const data = {
      token,
      refresh_token,
    };

    return data;
  }

  static async destroy(prisma: PrismaClient | Prisma.TransactionClient, refresh_token: string) {
    await prisma.accessToken.delete({
      where: {
        refresh_token,
      },
    }); 
  }

  static async destroyByToken(prisma: PrismaClient | Prisma.TransactionClient, token: string) {
    await prisma.accessToken.deleteMany({
      where: {
        token,
      },
    });
  }
}
