import { PrismaClient, Prisma } from '@prisma/client';
import {
  IRoleMenuObject,
  IRoleMenuCreateData,
  IRoleMenuUpdateData,
  IRoleMenuUpsertData,
  IRoleMenuPerm,
  IMenuWithPerm,
  IRoleMenuListResponse,
} from '../../model/role-menu-model';

export interface IRoleMenuRepository {
  findMany(where: Prisma.RoleMenuWhereInput): Promise<IRoleMenuObject[]>;

  findManyByRoleId(roleId: number): Promise<IRoleMenuPerm[]>;

  findUnique(roleId: number, menuId: number): Promise<IRoleMenuObject | null>;

  create(data: IRoleMenuCreateData): Promise<IRoleMenuObject>;

  update(
    roleId: number,
    menuId: number,
    data: IRoleMenuUpdateData,
  ): Promise<IRoleMenuObject>;

  upsert(data: IRoleMenuUpsertData): Promise<IRoleMenuObject>;

  upsertMany(data: IRoleMenuUpsertData[]): Promise<IRoleMenuObject[]>;

  delete(roleId: number, menuId: number): Promise<IRoleMenuObject>;

  deleteByRoleId(roleId: number): Promise<void>;

  deleteByMenuId(menuId: number): Promise<void>;

  getMenuWithPermissions(roleId: number): Promise<IMenuWithPerm[]>;
}
