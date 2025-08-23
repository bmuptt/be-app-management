import { prismaClient } from '../config/database';
import { ResponseError } from '../config/response-error';
import { ILoginRequest } from '../model/auth-model';
import bcrypt from 'bcrypt';
import { UserService } from './user-service';
import { AccessTokenService } from './accessToken-service';
import { IUserObject, IUserObjectWithoutPassword } from '../model/user-model';
import { IMenu } from '../model/menu-model';
import { IRoleMenuPerm } from '../model/role-menu-model';
import { authRepository } from '../repository';

// Type for RoleMenu with included menu
interface IRoleMenuWithMenu {
  menu: IMenu;
}

export class AuthService {
  static async login(req: ILoginRequest) {
    const user = await UserService.detailFromEmail(req.email);

    if (!user)
      throw new ResponseError(400, ['Email or password is incorrect!']);

    if (user?.active !== 'Active') {
      throw new ResponseError(400, ['User inactive!']);
    }

    const isPasswordValid = await bcrypt.compare(req.password, user.password);

    if (!isPasswordValid)
      throw new ResponseError(400, ['Email or password is incorrect!']);

    const formattedUser: IUserObject = {
      ...user,
      active: user.active === 'Active' ? 'Active' : 'Inactive',
    };

    const { token, refresh_token } = await AccessTokenService.addToken(
      prismaClient,
      formattedUser
    );

    return { token, refresh_token, user };
  }

  static async refreshToken(refreshToken: string) {
    if (!refreshToken) {
      throw new ResponseError(403, ['Refresh token not found']);
    }

    const accessToken = await authRepository.findAccessTokenByRefreshToken(refreshToken);

    if (!accessToken) {
      throw new ResponseError(403, ['Refresh token not found']);
    }

    const user = await UserService.detail(prismaClient, accessToken.user_id);

    if (!user) {
      throw new ResponseError(403, ['Refresh token not found']);
    }

    return prismaClient.$transaction(async (prisma) => {
      const formattedUser: IUserObjectWithoutPassword = {
        ...user,
        active: user.active === 'Active' ? 'Active' : 'Inactive',
      };

      const { token, refresh_token } = await AccessTokenService.addToken(
        prismaClient,
        formattedUser
      );

      await AccessTokenService.destroy(prisma, refreshToken);

      return { token, refresh_token, user: formattedUser };
    });
  }

  static buildMenuTree(
    menus: IMenu[],
    parentId: number | null = null
  ): IMenu[] {
    return menus
      .filter((menu) => menu.menu_id === parentId)
      .map((menu) => ({
        ...menu,
        children: AuthService.buildMenuTree(menus, menu.id),
      }));
  }

  static async listMenu(auth: IUserObject) {
    const checkRole = await authRepository.findUserWithRole(auth.id);

    let nestedMenus: IMenu[] = [];

    if (checkRole?.role_id) {
      const user = await authRepository.findUserWithRoleAndMenus(auth.id);

      if (!user || !user.role) {
        throw new ResponseError(404, ['Data Not Found!']);
      }

      const flatMenus = user.role.menus.map((roleMenu: IRoleMenuWithMenu) => roleMenu.menu);
      nestedMenus = await AuthService.buildMenuTree(flatMenus);
    }

    return nestedMenus;
  }

  static async permission(auth: IUserObject, key_menu: string) {
    const data = {
      access: false,
      create: false,
      update: false,
      delete: false,
      approve1: false,
      approve2: false,
      approve3: false,
    };

    const checkRole = await authRepository.findUserWithRole(auth.id);
    const menu = await authRepository.findMenuByKeyMenu(key_menu);

    if (checkRole?.role_id && menu) {
      const roleMenu: IRoleMenuPerm | null = await authRepository.findRoleMenuByMenuAndRole(menu.id, checkRole.role_id);

      if (roleMenu) {
        data.access = roleMenu.access;
        data.create = roleMenu.create;
        data.update = roleMenu.update;
        data.delete = roleMenu.delete;
        data.approve1 = roleMenu.approval;
        data.approve2 = roleMenu.approval_2;
        data.approve3 = roleMenu.approval_3;
      }
    }

    return data;
  }
}
