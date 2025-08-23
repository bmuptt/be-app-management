import { IUserObject, IUserObjectWithoutPassword } from '../model/user-model';
import {
  generateRefreshToken,
  generateToken,
} from '../validation/auth-validation';
import { IAccessTokenResponse } from '../model/accessToken-model';
import { PrismaClient, Prisma } from '@prisma/client';
import { accessTokenRepository } from '../repository';

export class AccessTokenService {
  static async detailByRefreshToken(prisma: PrismaClient, refresh_token: string) {
    return await accessTokenRepository.findUniqueByRefreshToken(prisma, refresh_token);
  }

  static async addToken(prisma: PrismaClient | Prisma.TransactionClient, user: IUserObject | IUserObjectWithoutPassword): Promise<IAccessTokenResponse> {
    const token = generateToken(user);
    const refresh_token = generateRefreshToken();

    return await accessTokenRepository.create(prisma, user, token, refresh_token);
  }

  static async destroy(prisma: PrismaClient | Prisma.TransactionClient, refresh_token: string) {
    await accessTokenRepository.deleteByRefreshToken(prisma, refresh_token);
  }

  static async destroyByToken(prisma: PrismaClient | Prisma.TransactionClient, token: string) {
    await accessTokenRepository.deleteByToken(prisma, token);
  }
}
