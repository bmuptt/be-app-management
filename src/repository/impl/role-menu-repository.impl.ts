import { PrismaClient, Prisma } from '@prisma/client';
import { prismaClient } from '../../config/database';
import { IRoleMenuRepository } from '../contract/role-menu-repository.contract';
import {
  IRoleMenuObject,
  IRoleMenuCreateData,
  IRoleMenuUpdateData,
  IRoleMenuUpsertData,
  IRoleMenuPerm,
  IMenuWithPerm,
} from '../../model/role-menu-model';
import { IMenuObject } from '../../model/menu-model';

export class RoleMenuRepository implements IRoleMenuRepository {
  async findMany(where: Prisma.RoleMenuWhereInput): Promise<IRoleMenuObject[]> {
    return await prismaClient.roleMenu.findMany({
      where,
    });
  }

  async findManyByRoleId(roleId: number): Promise<IRoleMenuPerm[]> {
    return await prismaClient.roleMenu.findMany({
      where: { role_id: roleId },
    });
  }

  async findUnique(
    roleId: number,
    menuId: number,
  ): Promise<IRoleMenuObject | null> {
    return await prismaClient.roleMenu.findUnique({
      where: {
        role_id_menu_id: { role_id: roleId, menu_id: menuId },
      },
    });
  }

  async create(data: IRoleMenuCreateData): Promise<IRoleMenuObject> {
    return await prismaClient.roleMenu.create({
      data: {
        role: { connect: { id: data.role_id } },
        menu: { connect: { id: data.menu_id } },
        access: data.access,
        create: data.create ?? false,
        update: data.update ?? false,
        delete: data.delete ?? false,
        approval: data.approval ?? false,
        approval_2: data.approval_2 ?? false,
        approval_3: data.approval_3 ?? false,
      },
    });
  }

  async update(
    roleId: number,
    menuId: number,
    data: IRoleMenuUpdateData,
  ): Promise<IRoleMenuObject> {
    return await prismaClient.roleMenu.update({
      where: {
        role_id_menu_id: { role_id: roleId, menu_id: menuId },
      },
      data,
    });
  }

  async upsert(data: IRoleMenuUpsertData): Promise<IRoleMenuObject> {
    return await prismaClient.roleMenu.upsert({
      where: {
        role_id_menu_id: { role_id: data.role_id, menu_id: data.menu_id },
      },
      update: {
        access: data.access,
        create: data.create ?? false,
        update: data.update ?? false,
        delete: data.delete ?? false,
        approval: data.approval ?? false,
        approval_2: data.approval_2 ?? false,
        approval_3: data.approval_3 ?? false,
      },
      create: {
        role: { connect: { id: data.role_id } },
        menu: { connect: { id: data.menu_id } },
        access: data.access,
        create: data.create ?? false,
        update: data.update ?? false,
        delete: data.delete ?? false,
        approval: data.approval ?? false,
        approval_2: data.approval_2 ?? false,
        approval_3: data.approval_3 ?? false,
      },
    });
  }

  async upsertMany(data: IRoleMenuUpsertData[]): Promise<IRoleMenuObject[]> {
    return await prismaClient.$transaction(async (tx: Prisma.TransactionClient) => {
      const upsertPromises = data.map(async (item) => {
        return tx.roleMenu.upsert({
          where: {
            role_id_menu_id: { role_id: item.role_id, menu_id: item.menu_id },
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
            role: { connect: { id: item.role_id } },
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

  async delete(roleId: number, menuId: number): Promise<IRoleMenuObject> {
    return await prismaClient.roleMenu.delete({
      where: {
        role_id_menu_id: { role_id: roleId, menu_id: menuId },
      },
    });
  }

  async deleteByRoleId(roleId: number): Promise<void> {
    await prismaClient.roleMenu.deleteMany({
      where: { role_id: roleId },
    });
  }

  async deleteByMenuId(menuId: number): Promise<void> {
    await prismaClient.roleMenu.deleteMany({
      where: { menu_id: menuId },
    });
  }

  async getMenuWithPermissions(roleId: number): Promise<IMenuWithPerm[]> {
    const menus: IMenuObject[] = await prismaClient.menu.findMany({
      where: { active: 'Active' },
      orderBy: { order_number: 'asc' },
    });

    const perms = await this.findManyByRoleId(roleId);

    const permMap = new Map<number, IRoleMenuPerm>();
    perms.forEach((p) => permMap.set(p.menu_id, p));

    type RawNode = IMenuWithPerm & { menu_id: number | null };
    const rawNodes: RawNode[] = menus.map((m: IMenuObject) => {
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
        menu_id: m.menu_id,
      };
    });

    const nodeMap = new Map<number, RawNode>();
    rawNodes.forEach((n) => nodeMap.set(n.id, n));
    const tree: RawNode[] = [];

    rawNodes.forEach((n) => {
      if (n.menu_id === null) {
        tree.push(n);
      } else {
        const parent = nodeMap.get(n.menu_id);
        if (parent) {
          parent.children.push(n);
        }
      }
    });

    return tree;
  }
}
