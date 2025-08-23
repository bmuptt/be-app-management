import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { prismaClient } from '../src/config/database';
import supertest from 'supertest';
import { web } from '../src/config/web';

dotenv.config();

export class TestHelper {
  /**
   * Migrate dan seed ulang database untuk setiap test case
   * Seperti integration test di Laravel
   */
  static async refreshDatabase() {
    try {
      console.log('🔄 Refreshing database...');
      
      // Disconnect and reconnect to ensure clean state
      await prismaClient.$disconnect();
      
      // Clean database terlebih dahulu (in correct order due to foreign keys)
      await prismaClient.accessToken.deleteMany({});
      await prismaClient.roleMenu.deleteMany({});
      await prismaClient.user.deleteMany({});
      await prismaClient.role.deleteMany({});
      await prismaClient.menu.deleteMany({});
      
      // Reset sequence dengan error handling
      try {
        await prismaClient.$executeRaw`ALTER SEQUENCE users_id_seq RESTART WITH 1;`;
        await prismaClient.$executeRaw`ALTER SEQUENCE roles_id_seq RESTART WITH 1;`;
        await prismaClient.$executeRaw`ALTER SEQUENCE menus_id_seq RESTART WITH 1;`;
        await prismaClient.$executeRaw`ALTER SEQUENCE access_tokens_id_seq RESTART WITH 1;`;
      } catch (seqError) {
        console.log('⚠️ Sequence reset warning (might not exist):', seqError.message);
      }
      
      // Wait a bit to ensure all connections are properly closed
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Disconnect and reconnect to ensure clean state
      await prismaClient.$disconnect();
      await prismaClient.$connect();
      
      // Seed data dengan timeout yang lebih lama
      execSync('npm run seed:user', { stdio: 'inherit', timeout: 60000 });
      
      // Verify database is clean
      const userCount = await prismaClient.user.count();
      const roleCount = await prismaClient.role.count();
      const menuCount = await prismaClient.menu.count();
      
      console.log(`✅ Database refreshed successfully - Users: ${userCount}, Roles: ${roleCount}, Menus: ${menuCount}`);
      
      // Small delay to ensure database is fully ready
      await new Promise(resolve => setTimeout(resolve, 100));
    } catch (error) {
      console.error('❌ Error refreshing database:', error.message);
      throw error;
    }
  }

  /**
   * Cleanup database setelah test
   */
  static async cleanupDatabase() {
    try {
      // Clean in correct order due to foreign key constraints
      await prismaClient.accessToken.deleteMany({});
      await prismaClient.roleMenu.deleteMany({});
      await prismaClient.user.deleteMany({});
      await prismaClient.role.deleteMany({});
      await prismaClient.menu.deleteMany({});
      
      console.log('🧹 Database cleaned up');
    } catch (error) {
      console.error('❌ Error cleaning up database:', error.message);
      // Don't throw error during cleanup to avoid masking test failures
    }
  }
}

export class AuthLogic {
  static async getLoginSuperAdmin() {
    const response = await supertest(web).post('/api/login').send({
      email: process.env.EMAIL_ADMIN,
      password: process.env.PASS_ADMIN,
    });

    return response;
  }

  static async getLoginUser(email: string, password: string) {
    const response = await supertest(web).post('/api/login').send({
      email,
      password,
    });

    return response;
  }

  static async logout(token: string) {
    const response = await supertest(web)
      .post('/api/logout')
      .set('Authorization', `Bearer ${token}`);

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
