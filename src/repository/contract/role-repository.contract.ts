import { PrismaClient, Prisma } from '@prisma/client';
import {
  IRoleObject,
  IRoleCreateData,
  IRoleUpdateData,
  IRoleListResponse,
} from '../../model/role-model';
import { IRequestList } from '../../model/global-model';

export interface IRoleRepository {
  findMany(
    where: Prisma.RoleWhereInput,
    orderBy: Prisma.RoleOrderByWithRelationInput[],
    skip: number,
    take: number,
  ): Promise<IRoleObject[]>;

  count(where: Prisma.RoleWhereInput): Promise<number>;

  findUnique(id: number): Promise<IRoleObject | null>;

  create(data: IRoleCreateData): Promise<IRoleObject>;

  update(id: number, data: IRoleUpdateData): Promise<IRoleObject>;

  delete(id: number): Promise<IRoleObject>;

  updateUsersRoleId(roleId: number): Promise<void>;

  deleteWithTransaction(id: number): Promise<IRoleObject>;
}
