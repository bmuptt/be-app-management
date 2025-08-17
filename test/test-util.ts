import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { prismaClient } from '../src/config/database';
import supertest from 'supertest';
import { web } from '../src/config/web';

dotenv.config();

export class AuthLogic {
  static async getLoginSuperAdmin() {
    const response = await supertest(web).post('/api/login').send({
      email: process.env.EMAIL_ADMIN,
      password: process.env.PASS_ADMIN,
    });

    return response;
  }
}

export class UserTable {
  static async resetUserIdSequence() {
    await prismaClient.$executeRaw`ALTER SEQUENCE users_id_seq RESTART WITH 1;`;
    await prismaClient.$executeRaw`ALTER SEQUENCE roles_id_seq RESTART WITH 1;`;
    await prismaClient.$executeRaw`ALTER SEQUENCE menus_id_seq RESTART WITH 1;`;
  }

  static async callUserSeed() {
    try {
      execSync('npm run seed:user', { stdio: 'inherit' });
    } catch (error) {
      console.error('Error running seed:user:', error.message);
    }
  }

  static async delete() {
    await prismaClient.user.deleteMany({});
    await prismaClient.role.deleteMany({});
    await prismaClient.menu.deleteMany({});
    await prismaClient.roleMenu.deleteMany({});
    console.log('All records deleted');
  }
}

export class AccessTokenTable {
  static async resetAccessTokenIdSequence() {
    await prismaClient.$executeRaw`ALTER SEQUENCE access_tokens_id_seq RESTART WITH 1;`;
  }

  static async delete() {
    await prismaClient.accessToken.deleteMany({});
    console.log('All records deleted');
  }
}
