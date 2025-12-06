import { PrismaClient, Prisma } from '@prisma/client';
import { prismaClient } from '../../config/database';
import { IRoleRepository } from '../contract/role-repository.contract';
import {
  IRoleObject,
  IRoleCreateData,
  IRoleUpdateData,
} from '../../model/role-model';

export class RoleRepository implements IRoleRepository {
  async findMany(
    where: Prisma.RoleWhereInput,
    orderBy: Prisma.RoleOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<IRoleObject[]> {
    return await prismaClient.role.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }

  async count(where: Prisma.RoleWhereInput): Promise<number> {
    return await prismaClient.role.count({
      where,
    });
  }

  async findUnique(id: number): Promise<IRoleObject | null> {
    return await prismaClient.role.findUnique({
      where: {
        id,
      },
    });
  }

  async create(data: IRoleCreateData): Promise<IRoleObject> {
    return await prismaClient.role.create({
      data,
    });
  }

  async update(id: number, data: IRoleUpdateData): Promise<IRoleObject> {
    return await prismaClient.role.update({
      where: { id },
      data,
    });
  }

  async delete(id: number): Promise<IRoleObject> {
    return await prismaClient.role.delete({
      where: { id },
    });
  }

  async updateUsersRoleId(roleId: number): Promise<void> {
    await prismaClient.user.updateMany({
      where: { role_id: roleId },
      data: { role_id: null },
    });
  }

  async deleteWithTransaction(id: number): Promise<IRoleObject> {
    return await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      await tx.user.updateMany({
        where: { role_id: id },
        data: { role_id: null },
      });

      return await tx.role.delete({
        where: { id },
      });
    });
  }
}
