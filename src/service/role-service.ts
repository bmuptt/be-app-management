import { Prisma } from '@prisma/client';
import { prismaClient } from '../config/database';
import { IRequestList } from '../model/global-model';
import { IRequestRole, IRoleCreateData, IRoleUpdateData } from '../model/role-model';
import { IUserObject } from '../model/user-model';
import { pagination } from '../helper/pagination-helper';
import { roleRepository } from '../repository';

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

    const data = await roleRepository.findMany(where, orderBy, skip, take);
    const total = await roleRepository.count(where);

    return {
      data,
      total,
    };
  }

  static async detail(id: number) {
    return await roleRepository.findUnique(id);
  }

  static async store(req: IRequestRole, auth: IUserObject) {
    const createData: IRoleCreateData = {
      name: req.name,
      created_by: auth.id,
    };

    return await roleRepository.create(createData);
  }

  static async update(id: number, req: IRequestRole, auth: IUserObject) {
    const updateData: IRoleUpdateData = {
      name: req.name,
      updated_by: auth.id,
    };

    return await roleRepository.update(id, updateData);
  }

  static async destroy(id: number) {
    return await roleRepository.deleteWithTransaction(id);
  }
}
