import { Prisma } from '@prisma/client';
import { prismaClient } from '../config/database';
import { IRequestList } from '../model/global-model';
import { IRequestRole } from '../model/role-model';
import { IUserObject } from '../model/user-model';
import { pagination } from '../helper/pagination-helper';

const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';

export class RoleService {
  static async index(req: IRequestList, auth: IUserObject) {
    const where: Prisma.RoleWhereInput = {};

    if (req.search) {
      where.OR = [{ name: { contains: req.search, mode: 'insensitive' } }];
    }

    if (auth.email !== emailAdmin) {
      where.name = { not: 'Super Admin' };
    }

    const orderBy: Prisma.RoleOrderByWithRelationInput[] = [];

    if (req.order_field && req.order_dir) {
      orderBy.push({ [req.order_field]: req.order_dir });
    }

    orderBy.push({ id: 'desc' });

    const { take, skip } = pagination(req);

    const data = await prismaClient.role.findMany({
      where,
      orderBy,
      skip,
      take,
    });

    const total = await prismaClient.role.count({
      where,
    });

    return {
      data,
      total,
    };
  }

  static async detail(id: number) {
    return await prismaClient.role.findUnique({
      where: {
        id,
      },
    });
  }

  static async store(req: IRequestRole, auth: IUserObject) {
    const data = await prismaClient.role.create({
      data: {
        name: req.name,
        created_by: auth.id,
      },
    });

    return data;
  }

  static async update(id: number, req: IRequestRole, auth: IUserObject) {
    const data = await prismaClient.role.update({
      where: { id },
      data: {
        name: req.name,
        updated_by: auth.id,
      },
    });

    return data;
  }

  static async destroy(id: number) {
    return await prismaClient.$transaction(async (tx) => {
      await tx.user.updateMany({
        where: { role_id: id },
        data: { role_id: null }, // atau hapus relasi, tergantung modelnya
      });
  
      const data = await tx.role.delete({
        where: { id },
      });
  
      return data;
    });

  }
}
