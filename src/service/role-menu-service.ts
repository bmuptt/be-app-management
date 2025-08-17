import { prismaClient } from '../config/database';
import { IMenuWithPerm, IRequestRoleMenu, IRoleMenuPerm } from '../model/role-menu-model';

export class RoleMenuService {
  // static async index(role_id: number, menu_id: number) {
  //   const where: Prisma.MenuWhereInput = {};

  //   if (menu_id === 0) {
  //     where.menu_id = null;
  //   } else {
  //     where.menu_id = menu_id;
  //   }

  //   where.active = 'Active';

  //   const menus = await prismaClient.menu.findMany({
  //     where,
  //     orderBy: [
  //       {
  //         order_number: 'asc',
  //       },
  //       {
  //         id: 'asc',
  //       },
  //     ],
  //     include: {
  //       roles: { // Ganti `roleMenu` dengan `roles` sesuai model relasi di Prisma
  //         where: { role_id },
  //         select: {
  //           access: true,
  //           create: true,
  //           update: true,
  //           delete: true,
  //           approval: true,
  //           approval_2: true,
  //           approval_3: true,
  //         },
  //       },
  //     },
  //   });

  //   const formattedMenus = menus.map((menu) => {
  //     const roleMenu = menu.roles[0]; // Ambil data dari role_menu jika ada

  //     return {
  //       id: menu.id,
  //       name: menu.name,
  //       url: menu.url,
  //       order_number: menu.order_number,
  //       permissions: {
  //         access: roleMenu?.access ?? false,
  //         create: roleMenu?.create ?? false,
  //         update: roleMenu?.update ?? false,
  //         delete: roleMenu?.delete ?? false,
  //         approval: roleMenu?.approval ?? false,
  //         approval_2: roleMenu?.approval_2 ?? false,
  //         approval_3: roleMenu?.approval_3 ?? false,
  //       },
  //     };
  //   });

  //   return {
  //     data: formattedMenus,
  //   };
  // }

  static async index(role_id: number) {
    const menus = await prismaClient.menu.findMany({
      where: { active: 'Active' },
      orderBy: { order_number: 'asc' },
    });

    const perms = await prismaClient.roleMenu.findMany({
      where: { role_id: role_id },
    });

    const permMap = new Map<number, IRoleMenuPerm>();
    perms.forEach((p) => permMap.set(p.menu_id, p));

    type RawNode = IMenuWithPerm & { menu_id: number | null };
    const rawNodes: RawNode[] = menus.map((m) => {
      const p = permMap.get(m.id);
      return {
        id: m.id,
        key_menu: m.key_menu,
        name: m.name,
        url: m.url,
        order_number: m.order_number,
        active: m.active,
        permissions: {
          access: p?.access ?? false,
          create: p?.create ?? false,
          update: p?.update ?? false,
          delete: p?.delete ?? false,
          approval: p?.approval ?? false,
          approval_2: p?.approval_2 ?? false,
          approval_3: p?.approval_3 ?? false,
        },
        children: [],
        menu_id: m.menu_id, // parent foreign key
      };
    });

    const nodeMap = new Map<number, RawNode>();
    rawNodes.forEach((n) => nodeMap.set(n.id, n));
    const tree: RawNode[] = [];

    rawNodes.forEach((n) => {
      if (n.menu_id === null) {
        // top‐level
        tree.push(n);
      } else {
        // attach ke parent
        const parent = nodeMap.get(n.menu_id);
        if (parent) {
          parent.children.push(n);
        }
      }
    });

    return {
      data: tree,
    }
  }

  static async store(role_id: number, req: IRequestRoleMenu[]) {
    return prismaClient.$transaction(async (tx) => {
      const upsertPromises = req.map(async (item) => {
        return tx.roleMenu.upsert({
          where: {
            role_id_menu_id: { role_id, menu_id: item.menu_id },
          },
          update: {
            access: item.access,
            create: item.create ?? false,
            update: item.update ?? false,
            delete: item.delete ?? false,
            approval: item.approval ?? false,
            approval_2: item.approval_2 ?? false,
            approval_3: item.approval_3 ?? false,
          },
          create: {
            role: { connect: { id: role_id } },
            menu: { connect: { id: item.menu_id } },
            access: item.access,
            create: item.create ?? false,
            update: item.update ?? false,
            delete: item.delete ?? false,
            approval: item.approval ?? false,
            approval_2: item.approval_2 ?? false,
            approval_3: item.approval_3 ?? false,
          },
        });
      });

      return Promise.all(upsertPromises);
    });
  }
}
