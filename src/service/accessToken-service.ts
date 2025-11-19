import { IUserObject, IUserObjectWithoutPassword } from '../model/user-model';
import {
  generateRefreshToken,
  generateToken,
} from '../validation/auth-validation';
import { IAccessTokenResponse } from '../model/accessToken-model';
import { PrismaClient, Prisma } from '@prisma/client';
import { accessTokenRepository } from '../repository';

// Type alias untuk kompatibilitas dengan Extended Prisma Client
type PrismaClientOrTransaction = PrismaClient | Prisma.TransactionClient | any;

export class AccessTokenService {
  static async detailByRefreshToken(
    prisma: PrismaClientOrTransaction,
    refresh_token: string,
  ) {
    return await accessTokenRepository.findUniqueByRefreshToken(
      prisma,
      refresh_token,
    );
  }

  static async addToken(
    prisma: PrismaClientOrTransaction,
    user: IUserObject | IUserObjectWithoutPassword,
  ): Promise<IAccessTokenResponse> {
    const token = generateToken(user);
    const refresh_token = generateRefreshToken();

    return await accessTokenRepository.create(
      prisma,
      user,
      token,
      refresh_token,
    );
  }

  static async destroy(
    prisma: PrismaClientOrTransaction,
    refresh_token: string,
  ) {
    await accessTokenRepository.deleteByRefreshToken(prisma, refresh_token);
  }

  static async destroyByToken(
    prisma: PrismaClientOrTransaction,
    token: string,
  ) {
    await accessTokenRepository.deleteByToken(prisma, token);
  }
}
