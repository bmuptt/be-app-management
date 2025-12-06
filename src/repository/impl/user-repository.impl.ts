import { PrismaClient, Prisma } from '@prisma/client';
import { prismaClient } from '../../config/database';
import { IUserRepository } from '../contract/user-repository.contract';
import {
  IUserObject,
  IUserWithRole,
  IUserCreateData,
  IUserUpdateData,
  IUserEmailLookup,
} from '../../model/user-model';

export class UserRepository implements IUserRepository {
  async findMany(
    where: Prisma.UserWhereInput,
    orderBy: Prisma.UserOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<IUserObject[]> {
    return await prismaClient.user.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }

  async count(where: Prisma.UserWhereInput): Promise<number> {
    return await prismaClient.user.count({
      where,
    });
  }

  async findFirstByEmail(
    email: string,
    excludeId?: number | null,
  ): Promise<IUserObject | null> {
    return await prismaClient.user.findFirst({
      where: {
        email,
        ...(excludeId !== null &&
          excludeId !== undefined && { id: { not: excludeId } }),
      },
    });
  }

  async findUniqueWithRole(
    prisma: PrismaClient | Prisma.TransactionClient,
    id: number,
  ): Promise<IUserWithRole | null> {
    return await prisma.user.findUnique({
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        birthdate: true,
        photo: true,
        active: true,
        role_id: true,
        created_by: true,
        created_at: true,
        updated_by: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true,
            created_by: true,
            created_at: true,
            updated_by: true,
            updated_at: true,
          },
        },
      },
      where: {
        id,
      },
    });
  }

  async create(data: IUserCreateData): Promise<IUserObject> {
    return await prismaClient.user.create({
      data,
    });
  }

  async update(id: number, data: IUserUpdateData): Promise<IUserObject> {
    return await prismaClient.user.update({
      where: { id },
      data,
    });
  }

  async updateActiveStatus(
    id: number,
    status: string,
    updatedBy: number,
  ): Promise<IUserObject> {
    return await prismaClient.user.update({
      where: { id },
      data: {
        active: status,
        updated_by: updatedBy,
      },
    });
  }

  async findEmailsByIds(ids: number[]): Promise<IUserEmailLookup[]> {
    if (!ids.length) {
      return [];
    }

    const users = await prismaClient.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        email: true,
      },
    });

    return users;
  }

  async findDetailsByIds(ids: number[]): Promise<IUserWithRole[]> {
    if (!ids.length) {
      return [];
    }

    const users = await prismaClient.user.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        email: true,
        gender: true,
        birthdate: true,
        photo: true,
        active: true,
        role_id: true,
        created_by: true,
        created_at: true,
        updated_by: true,
        updated_at: true,
        role: {
          select: {
            id: true,
            name: true,
            created_by: true,
            created_at: true,
            updated_by: true,
            updated_at: true,
          },
        },
      },
    });

    return users;
  }
}
