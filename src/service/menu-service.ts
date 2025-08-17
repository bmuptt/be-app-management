import { Prisma } from '@prisma/client';
import { prismaClient } from '../config/database';
import {
  IRequestMenu,
  IRequestMenuChangeParent,
  IRequestMenuSort,
  IRequestMenuStore,
} from '../model/menu-model';
import { IUserObject } from '../model/user-model';
import { IRequestList } from '../model/global-model';
import { pagination } from '../helper/pagination-helper';

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

    const data = await prismaClient.menu.findMany({
      include: {
        children: true,
      },
      where,
      orderBy: [
        {
          order_number: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    return {
      data,
    };
  }

  static async detail(id: number) {
    return await prismaClient.menu.findUnique({
      include: {
        children: true,
      },
      where: {
        id,
      },
    });
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

    const data = await prismaClient.menu.findMany({
      where,
      orderBy,
      skip,
      take,
    });

    const total = await prismaClient.menu.count({
      where,
    });

    return {
      data,
      total,
    };
  }

  static async getAllNestedMenus() {
    const flatMenus = await prismaClient.menu.findMany({
      where: {
        active: 'Active',
      },
      orderBy: {
        order_number: 'asc',
      },
      select: {
        id: true,
        key_menu: true,
        name: true,
        url: true,
        order_number: true,
        active: true,
        menu_id: true, // ini penanda parent-nya
      },
    });

    const menuMap = new Map<number, any>();
    const tree: any[] = [];

    // Inisialisasi: tambahkan submenus kosong ke setiap item
    for (const menu of flatMenus) {
      (menu as any).children = [];
      menuMap.set(menu.id, menu);
    }

    for (const menu of flatMenus) {
      if (menu.menu_id) {
        const parent = menuMap.get(menu.menu_id);
        if (parent) {
          parent.children.push(menu);
        }
      } else {
        tree.push(menu); // Root menu (tidak punya parent)
      }
    }

    return tree;
  }

  static async menuLastByParentId(menu_id: number | null) {
    const menuLast = await prismaClient.menu.findFirst({
      where: {
        menu_id,
      },
      orderBy: [
        {
          order_number: 'desc',
        },
        {
          id: 'desc',
        },
      ],
    });

    let order_number = 0;

    if (menuLast) {
      order_number = menuLast.order_number;
    }

    return order_number + 1;
  }

  static async store(req: IRequestMenuStore, auth: IUserObject) {
    const menu_id = req.menu_id ?? null;

    const order_number = await this.menuLastByParentId(menu_id);

    const data = await prismaClient.menu.create({
      data: {
        key_menu: req.key_menu,
        name: req.name,
        order_number,
        url: req.url,
        menu_id,
        active: 'Active',
        created_by: auth.id,
      },
    });

    return data;
  }

  static async update(id: number, req: IRequestMenu, auth: IUserObject) {
    const data = await prismaClient.menu.update({
      where: { id },
      data: {
        key_menu: req.key_menu,
        name: req.name,
        url: req.url,
        updated_by: auth.id,
      },
    });

    return data;
  }

  static async sort(req: IRequestMenuSort, auth: IUserObject) {
    await prismaClient.$transaction(async (tx) => {
      await Promise.all(
        req.list_menu.map((data, index) =>
          tx.menu.update({
            where: { id: data.id },
            data: {
              order_number: index + 1,
              updated_by: auth.id,
            },
          })
        )
      );
    });
  }

  static async changeParent(
    id: number,
    req: IRequestMenuChangeParent,
    auth: IUserObject
  ) {
    const menu_id = req.menu_id ?? null;

    const order_number = await this.menuLastByParentId(menu_id);

    const data = await prismaClient.menu.update({
      where: {
        id,
      },
      data: {
        menu_id,
        order_number,
        updated_by: auth.id,
      },
    });

    return data;
  }

  static async destroy(id: number, auth: IUserObject) {
    return await prismaClient.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({
        where: { menu_id: id },
      });

      const data = await tx.menu.update({
        where: { id },
        data: {
          active: 'Inactive',
          updated_by: auth.id,
        },
      });

      return data;
    });
  }

  static async active(id: number, auth: IUserObject) {
    const data = await prismaClient.menu.update({
      where: { id },
      data: {
        active: 'Active',
        updated_by: auth.id,
      },
    });

    return data;
  }
}
