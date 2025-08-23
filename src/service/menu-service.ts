import { Prisma } from '@prisma/client';
import {
  IRequestMenu,
  IRequestMenuChangeParent,
  IRequestMenuSort,
  IRequestMenuStore,
  IMenuCreateData,
  IMenuUpdateData,
  IMenuChangeParentData,
  IMenuActiveData,
  IMenuObject,
} from '../model/menu-model';
import { IUserObject } from '../model/user-model';
import { IRequestList } from '../model/global-model';
import { pagination } from '../helper/pagination-helper';
import { menuRepository } from '../repository';

export class MenuService {
  static async index(id: number) {
    const where: Prisma.MenuWhereInput = {};

    if (id === 0) {
      where.menu_id = null;
    } else if (isNaN(id)) {
      // If ID is NaN (invalid format), return empty array
      return {
        data: [],
      };
    } else {
      where.menu_id = id;
    }

    const orderBy: Prisma.MenuOrderByWithRelationInput[] = [
      {
        order_number: 'asc',
      },
      {
        id: 'asc',
      },
    ];

    const data = await menuRepository.findManyWithChildren(where, orderBy);

    return {
      data,
    };
  }

  static async detail(id: number) {
    return await menuRepository.findUniqueWithChildren(id);
  }

  static async listHeader(id: number, req: IRequestList) {
    const where: Prisma.MenuWhereInput = {};
    where.id = { not: id };

    if (req.search) {
      where.OR = [
        { name: { contains: req.search, mode: 'insensitive' } },
        { key_menu: { contains: req.search, mode: 'insensitive' } },
      ];
    }

    const orderBy: Prisma.MenuOrderByWithRelationInput[] = [];

    if (req.order_field && req.order_dir) {
      orderBy.push({ [req.order_field]: req.order_dir });
    }

    orderBy.push({ id: 'desc' });

    const { take, skip } = pagination(req);

    const data = await menuRepository.findMany(where, orderBy, skip, take);
    const total = await menuRepository.count(where);

    return {
      data,
      total,
    };
  }

  static async getAllNestedMenus() {
    const flatMenus = await menuRepository.findManyActive();

    // Define interface for menu with children
    interface IMenuWithChildren extends IMenuObject {
      children: IMenuWithChildren[];
    }

    const menuMap = new Map<number, IMenuWithChildren>();
    const tree: IMenuWithChildren[] = [];

    // Inisialisasi: tambahkan submenus kosong ke setiap item
    for (const menu of flatMenus) {
      const menuWithChildren: IMenuWithChildren = {
        ...menu,
        children: [],
      };
      menuMap.set(menu.id, menuWithChildren);
    }

    // Build hierarchical structure
    for (const menu of flatMenus) {
      const menuWithChildren = menuMap.get(menu.id)!;
      
      if (menu.menu_id) {
        const parent = menuMap.get(menu.menu_id);
        if (parent) {
          parent.children.push(menuWithChildren);
        }
      } else {
        tree.push(menuWithChildren); // Root menu (tidak punya parent)
      }
    }

    return tree;
  }

  static async menuLastByParentId(menu_id: number | null) {
    const menuLast = await menuRepository.findFirstByParentId(menu_id);

    let order_number = 0;

    if (menuLast) {
      order_number = menuLast.order_number;
    }

    return order_number + 1;
  }

  static async store(req: IRequestMenuStore, auth: IUserObject) {
    const menu_id = req.menu_id ?? null;
    const order_number = await this.menuLastByParentId(menu_id);

    const createData: IMenuCreateData = {
      key_menu: req.key_menu,
      name: req.name,
      order_number,
      url: req.url,
      menu_id,
      active: 'Active',
      created_by: auth.id,
    };

    return await menuRepository.create(createData);
  }

  static async update(id: number, req: IRequestMenu, auth: IUserObject) {
    const updateData: IMenuUpdateData = {
      key_menu: req.key_menu,
      name: req.name,
      url: req.url,
      updated_by: auth.id,
    };

    return await menuRepository.update(id, updateData);
  }

  static async sort(req: IRequestMenuSort, auth: IUserObject) {
    const menus = req.list_menu.map((data, index) => ({
      id: data.id,
      order_number: index + 1,
      updated_by: auth.id,
    }));

    await menuRepository.sortMenus(menus);
  }

  static async changeParent(
    id: number,
    req: IRequestMenuChangeParent,
    auth: IUserObject
  ) {
    const menu_id = req.menu_id ?? null;
    const order_number = await this.menuLastByParentId(menu_id);

    const changeParentData: IMenuChangeParentData = {
      menu_id,
      order_number,
      updated_by: auth.id,
    };

    return await menuRepository.changeParent(id, changeParentData);
  }

  static async destroy(id: number, auth: IUserObject) {
    return await menuRepository.deleteWithTransaction(id, auth.id);
  }

  static async active(id: number, auth: IUserObject) {
    const activeData: IMenuActiveData = {
      active: 'Active',
      updated_by: auth.id,
    };

    return await menuRepository.updateActive(id, activeData);
  }
}
