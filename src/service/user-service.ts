import { PrismaClient, Prisma } from '@prisma/client';
import {
  IRequestUser,
  IUserEmailLookup,
  IUserObject,
  IUserDetailLookup,
} from '../model/user-model';
import bcrypt from 'bcrypt';
import { IRequestList } from '../model/global-model';
import { pagination } from '../helper/pagination-helper';
import { userRepository } from '../repository';

const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';
const passAdmin = process.env.PASS_ADMIN || 'admin123';

export class UserService {
  static async index(req: IRequestList, auth: IUserObject) {
    const where: Prisma.UserWhereInput = {};

    /**
     * untuk search global
     */
    if (req.search) {
      where.OR = [
        { name: { contains: req.search, mode: 'insensitive' } },
        { email: { contains: req.search, mode: 'insensitive' } },
      ];
    }

    if (auth.email !== emailAdmin) {
      where.email = { not: emailAdmin };
    }

    /**
     * untuk sort dari FE
     */
    const orderBy: Prisma.UserOrderByWithRelationInput[] = [];

    if (req.order_field && req.order_dir) {
      orderBy.push({ [req.order_field]: req.order_dir });
    }

    /**
     * default sort
     */
    orderBy.push({ id: 'desc' });

    /**
     * pembuatan paging
     */
    const { take, skip } = pagination(req);

    const users = await userRepository.findMany(where, orderBy, skip, take);
    const total = await userRepository.count(where);

    return {
      data: users,
      total,
    };
  }

  static async detailFromEmail(email: string, id: number | null = null) {
    return await userRepository.findFirstByEmail(email, id);
  }

  static async detail(
    prisma: PrismaClient | Prisma.TransactionClient,
    id: number,
  ) {
    return await userRepository.findUniqueWithRole(prisma, id);
  }

  static async store(req: IRequestUser & { user?: IUserObject }) {
    const hashedPassword = await bcrypt.hash(passAdmin, 10);

    const data = await userRepository.create({
      email: req.email,
      name: req.name,
      gender: req.gender,
      birthdate: new Date(req.birthdate),
      password: hashedPassword,
      active: 'Active',
      role_id: req.role_id,
      created_by: req.user?.id || 0,
    });

    return data;
  }

  static async update(id: number, req: IRequestUser, auth: IUserObject) {
    const data = await userRepository.update(id, {
      name: req.name,
      gender: req.gender,
      birthdate: new Date(req.birthdate),
      role_id: req.role_id,
      updated_by: auth.id,
    });

    return data;
  }

  static async resetPassword(id: number) {
    return await userRepository.updateActiveStatus(id, 'Inactive', id);
  }

  static async takeOut(id: number) {
    return await userRepository.updateActiveStatus(id, 'Take Out', id);
  }

  static async getEmailsByIds(ids: number[]): Promise<IUserEmailLookup[]> {
    if (!ids.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids));
    const users = await userRepository.findEmailsByIds(uniqueIds);
    const map = new Map(users.map((user) => [user.id, user.email]));

    const orderedUsers: IUserEmailLookup[] = [];
    for (const id of uniqueIds) {
      const email = map.get(id);
      if (email) {
        orderedUsers.push({ id, email });
      }
    }

    return orderedUsers;
  }

  static async getDetailsByIds(ids: number[]): Promise<IUserDetailLookup[]> {
    if (!ids.length) {
      return [];
    }

    const uniqueIds = Array.from(new Set(ids));
    const users = await userRepository.findDetailsByIds(uniqueIds);

    const map = new Map(
      users.map((user) => [
        user.id,
        {
          id: user.id,
          email: user.email,
          name: user.name,
          username: user.email.split('@')[0],
          role: user.role ? { id: user.role.id, name: user.role.name } : null,
          active: user.active,
          registered_at: user.created_at,
          contact: null,
        } as IUserDetailLookup,
      ]),
    );

    const orderedDetails: IUserDetailLookup[] = [];
    for (const id of uniqueIds) {
      const detail = map.get(id);
      if (detail) {
        orderedDetails.push(detail);
      }
    }

    return orderedDetails;
  }
}
