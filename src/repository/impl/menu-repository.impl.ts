import { PrismaClient, Prisma } from '@prisma/client';
import { prismaClient } from '../../config/database';
import { IMenuRepository } from '../contract/menu-repository.contract';
import { 
  IMenuObject, 
  IMenuCreateData, 
  IMenuUpdateData, 
  IMenuChangeParentData,
  IMenuActiveData
} from '../../model/menu-model';

export class MenuRepository implements IMenuRepository {
  async findMany(
    where: Prisma.MenuWhereInput, 
    orderBy: Prisma.MenuOrderByWithRelationInput[], 
    skip: number, 
    take: number
  ): Promise<IMenuObject[]> {
    return await prismaClient.menu.findMany({
      where,
      orderBy,
      skip,
      take,
    });
  }

  async findManyWithChildren(
    where: Prisma.MenuWhereInput, 
    orderBy: Prisma.MenuOrderByWithRelationInput[]
  ): Promise<IMenuObject[]> {
    return await prismaClient.menu.findMany({
      include: {
        children: true,
      },
      where,
      orderBy,
    });
  }

  async count(where: Prisma.MenuWhereInput): Promise<number> {
    return await prismaClient.menu.count({
      where,
    });
  }

  async findUnique(id: number): Promise<IMenuObject | null> {
    return await prismaClient.menu.findUnique({
      where: {
        id,
      },
    });
  }

  async findUniqueWithChildren(id: number): Promise<IMenuObject | null> {
    return await prismaClient.menu.findUnique({
      include: {
        children: true,
      },
      where: {
        id,
      },
    });
  }

  async findFirstByParentId(menuId: number | null): Promise<IMenuObject | null> {
    return await prismaClient.menu.findFirst({
      where: {
        menu_id: menuId,
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
  }

  async findManyActive(): Promise<IMenuObject[]> {
    return await prismaClient.menu.findMany({
      where: {
        active: 'Active',
      },
      orderBy: {
        order_number: 'asc',
      },
    });
  }

  async create(data: IMenuCreateData): Promise<IMenuObject> {
    return await prismaClient.menu.create({
      data,
    });
  }

  async update(id: number, data: IMenuUpdateData): Promise<IMenuObject> {
    return await prismaClient.menu.update({
      where: { id },
      data,
    });
  }

  async updateActive(id: number, data: IMenuActiveData): Promise<IMenuObject> {
    return await prismaClient.menu.update({
      where: { id },
      data,
    });
  }

  async changeParent(id: number, data: IMenuChangeParentData): Promise<IMenuObject> {
    return await prismaClient.menu.update({
      where: { id },
      data,
    });
  }

  async sortMenus(menus: { id: number; order_number: number; updated_by?: number | null }[]): Promise<void> {
    await prismaClient.$transaction(async (tx) => {
      await Promise.all(
        menus.map((data) =>
          tx.menu.update({
            where: { id: data.id },
            data: {
              order_number: data.order_number,
              updated_by: data.updated_by,
            },
          })
        )
      );
    });
  }

  async deleteWithTransaction(id: number, updatedBy: number): Promise<IMenuObject> {
    return await prismaClient.$transaction(async (tx) => {
      await tx.roleMenu.deleteMany({
        where: { menu_id: id },
      });

      return await tx.menu.update({
        where: { id },
        data: {
          active: 'Inactive',
          updated_by: updatedBy,
        },
      });
    });
  }

  async deleteRoleMenus(menuId: number): Promise<void> {
    await prismaClient.roleMenu.deleteMany({
      where: { menu_id: menuId },
    });
  }
}
