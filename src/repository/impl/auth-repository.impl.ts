import { prismaClient } from '../../config/database';
import { IAuthRepository } from '../contract/auth-repository.contract';
import { IUserWithRoleBasic, IUserWithRoleAndMenus, IMenuBasic, IAccessTokenBasic } from '../../model/auth-model';
import { IRoleMenuPerm } from '../../model/role-menu-model';

export class AuthRepository implements IAuthRepository {
  async findUserWithRole(userId: number): Promise<IUserWithRoleBasic | null> {
    return await prismaClient.user.findUnique({
      where: { id: userId },
      select: { id: true, role_id: true },
    });
  }

  async findUserWithRoleAndMenus(userId: number): Promise<IUserWithRoleAndMenus | null> {
    return await prismaClient.user.findUnique({
      where: { id: userId },
      include: {
        role: {
          include: {
            menus: {
              where: {
                access: true,
              },
              include: {
                menu: {
                  include: {
                    children: true,
                  },
                },
              },
              orderBy: {
                menu: {
                  order_number: 'asc',
                },
              },
            },
          },
        },
      },
    });
  }

  async findMenuByKeyMenu(keyMenu: string): Promise<IMenuBasic | null> {
    return await prismaClient.menu.findFirst({
      where: {
        key_menu: keyMenu,
      },
    });
  }

  async findRoleMenuByMenuAndRole(menuId: number, roleId: number): Promise<IRoleMenuPerm | null> {
    return await prismaClient.roleMenu.findFirst({
      where: {
        menu_id: menuId,
        role_id: roleId,
      },
    });
  }

  async findAccessTokenByRefreshToken(refreshToken: string): Promise<IAccessTokenBasic | null> {
    return await prismaClient.accessToken.findUnique({
      where: {
        refresh_token: refreshToken,
      },
    });
  }
}
