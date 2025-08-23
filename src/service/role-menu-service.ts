import { IMenuWithPerm, IRequestRoleMenu, IRoleMenuUpsertData } from '../model/role-menu-model';
import { roleMenuRepository } from '../repository';

export class RoleMenuService {
  static async index(role_id: number) {
    const tree = await roleMenuRepository.getMenuWithPermissions(role_id);

    return {
      data: tree,
    };
  }

  static async store(role_id: number, req: IRequestRoleMenu[]) {
    const upsertData: IRoleMenuUpsertData[] = req.map((item) => ({
      role_id,
      menu_id: item.menu_id,
      access: item.access,
      create: item.create ?? false,
      update: item.update ?? false,
      delete: item.delete ?? false,
      approval: item.approval ?? false,
      approval_2: item.approval_2 ?? false,
      approval_3: item.approval_3 ?? false,
    }));

    return await roleMenuRepository.upsertMany(upsertData);
  }
}
