import { PrismaClient, Prisma } from '@prisma/client';
import {
  IRequestUser,
  IUserObject,
  IUserWithRole,
  IUserCreateData,
  IUserUpdateData,
} from '../../model/user-model';
import { IRequestList } from '../../model/global-model';

export interface IUserRepository {
  findMany(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<IUserObject[]>;
  count(where: Prisma.UserWhereInput): Promise<number>;
  findFirstByEmail(
    email: string,
    excludeId?: number | null,
  ): Promise<IUserObject | null>;
  findUniqueWithRole(
    prisma: PrismaClient | Prisma.TransactionClient,
    id: number,
  ): Promise<IUserWithRole | null>;
  create(data: IUserCreateData): Promise<IUserObject>;
  update(id: number, data: IUserUpdateData): Promise<IUserObject>;
  updateActiveStatus(
    id: number,
    status: string,
    updatedBy: number,
  ): Promise<IUserObject>;
}
