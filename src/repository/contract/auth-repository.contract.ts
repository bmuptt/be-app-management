import { PrismaClient } from '@prisma/client';
import { IUserObject } from '../../model/user-model';
import { IMenu } from '../../model/menu-model';
import { IRoleMenuPerm } from '../../model/role-menu-model';
import {
  IUserWithRoleBasic,
  IUserWithRoleAndMenus,
  IMenuBasic,
  IAccessTokenBasic,
} from '../../model/auth-model';

export interface IAuthRepository {
  findUserWithRole(userId: number): Promise<IUserWithRoleBasic | null>;
  findUserWithRoleAndMenus(
    userId: number,
  ): Promise<IUserWithRoleAndMenus | null>;
  findMenuByKeyMenu(keyMenu: string): Promise<IMenuBasic | null>;
  findRoleMenuByMenuAndRole(
    menuId: number,
    roleId: number,
  ): Promise<IRoleMenuPerm | null>;
  findAccessTokenByRefreshToken(
    refreshToken: string,
  ): Promise<IAccessTokenBasic | null>;
}
