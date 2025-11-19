import dotenv from 'dotenv';
import { execSync } from 'child_process';
import { prismaClient } from '../src/config/database';
import supertest from 'supertest';
import { web } from '../src/config/web';
import bcrypt from 'bcrypt';
import { getOrCreateSchemaSetup } from './test-setup';

dotenv.config();

export class TestHelper {
  /**
   * Migrate dan seed ulang database untuk setiap test case
   * Seperti integration test di Laravel
   * Optimized untuk parallel testing with transaction isolation
   * Menggunakan Prisma transaction untuk atomic operations dan mencegah conflicts
   */
  static async refreshDatabase() {
    try {
      // Ensure schema is set up before using prismaClient
      await getOrCreateSchemaSetup();
      
      const workerId = process.env.JEST_WORKER_ID || '1';
      console.log(`🔄 [Worker ${workerId}] Refreshing database...`);

      // Use transaction to ensure atomic operations and prevent conflicts in parallel execution
      // All operations are wrapped in a single transaction for consistency
      await prismaClient.$transaction(async (tx) => {
        // Clean database terlebih dahulu (in correct order due to foreign keys)
        await tx.accessToken.deleteMany({});
        await tx.roleMenu.deleteMany({});
        await tx.user.deleteMany({});
        await tx.role.deleteMany({});
        await tx.menu.deleteMany({});

        // Reset sequence dengan error handling (safe in transaction)
        try {
          await tx.$executeRaw`ALTER SEQUENCE users_id_seq RESTART WITH 1;`;
        } catch (seqError) {
          // Sequence might not exist, ignore
        }

        try {
          await tx.$executeRaw`ALTER SEQUENCE roles_id_seq RESTART WITH 1;`;
        } catch (seqError) {
          // Sequence might not exist, ignore
        }

        try {
          await tx.$executeRaw`ALTER SEQUENCE menus_id_seq RESTART WITH 1;`;
        } catch (seqError) {
          // Sequence might not exist, ignore
        }

        try {
          await tx.$executeRaw`ALTER SEQUENCE access_tokens_id_seq RESTART WITH 1;`;
        } catch (seqError) {
          // Sequence might not exist, ignore
        }

        // Seed data langsung via Prisma dengan upsert untuk idempotency
        await TestHelper.seedDatabaseInTransaction(tx);
      }, {
        timeout: 30000, // 30 second timeout
      });

      // Verify database is ready
      const userCount = await prismaClient.user.count();
      const roleCount = await prismaClient.role.count();
      const menuCount = await prismaClient.menu.count();

      console.log(
        `✅ [Worker ${workerId}] Database refreshed successfully - Users: ${userCount}, Roles: ${roleCount}, Menus: ${menuCount}`,
      );
    } catch (error: any) {
      console.error('❌ Error refreshing database:', error.message);
      throw error;
    }
  }

  /**
   * Seed database dalam transaction (untuk digunakan di refreshDatabase)
   */
  private static async seedDatabaseInTransaction(tx: any) {
    const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';
    const passAdmin = process.env.PASS_ADMIN || 'admin123';

    // menu - menggunakan upsert untuk idempotency
    const menuAppManagement = await tx.menu.upsert({
      where: { key_menu: 'appmanagement' },
      update: {
        name: 'App Management',
        order_number: 1,
        active: 'Active',
      },
      create: {
        key_menu: 'appmanagement',
        name: 'App Management',
        order_number: 1,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuUser = await tx.menu.upsert({
      where: { key_menu: 'user' },
      update: {
        name: 'User',
        order_number: 1,
        url: '/app-management/user',
        menu_id: menuAppManagement.id,
        active: 'Active',
      },
      create: {
        key_menu: 'user',
        name: 'User',
        order_number: 1,
        url: '/app-management/user',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuRole = await tx.menu.upsert({
      where: { key_menu: 'role' },
      update: {
        name: 'Role',
        order_number: 2,
        url: '/app-management/role',
        menu_id: menuAppManagement.id,
        active: 'Active',
      },
      create: {
        key_menu: 'role',
        name: 'Role',
        order_number: 2,
        url: '/app-management/role',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuMenu = await tx.menu.upsert({
      where: { key_menu: 'menu' },
      update: {
        name: 'Menu',
        order_number: 3,
        url: '/app-management/menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
      },
      create: {
        key_menu: 'menu',
        name: 'Menu',
        order_number: 3,
        url: '/app-management/menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuRoleMenu = await tx.menu.upsert({
      where: { key_menu: 'rolemenu' },
      update: {
        name: 'Role Menu',
        order_number: 4,
        url: '/app-management/role-menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
      },
      create: {
        key_menu: 'rolemenu',
        name: 'Role Menu',
        order_number: 4,
        url: '/app-management/role-menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    // role - menggunakan upsert
    const roleAdmin = await tx.role.upsert({
      where: { name: 'Super Admin' },
      update: {},
      create: {
        name: 'Super Admin',
        created_by: 0,
      },
    });

    // role menu - delete dulu lalu create (karena composite key, upsert tidak langsung support)
    // Atau kita bisa gunakan deleteMany + createMany untuk efisiensi
    await tx.roleMenu.deleteMany({
      where: {
        role_id: roleAdmin.id,
      },
    });

    // Create role menu baru
    await tx.roleMenu.createMany({
      data: [
        {
          role_id: roleAdmin.id,
          menu_id: menuAppManagement.id,
          access: true,
        },
        {
          role_id: roleAdmin.id,
          menu_id: menuUser.id,
          access: true,
          create: true,
          update: true,
          delete: true,
          approval: false,
          approval_2: false,
          approval_3: false,
        },
        {
          role_id: roleAdmin.id,
          menu_id: menuRole.id,
          access: true,
          create: true,
          update: true,
          delete: true,
          approval: false,
          approval_2: false,
          approval_3: false,
        },
        {
          role_id: roleAdmin.id,
          menu_id: menuMenu.id,
          access: true,
          create: true,
          update: true,
          delete: true,
          approval: false,
          approval_2: false,
          approval_3: false,
        },
        {
          role_id: roleAdmin.id,
          menu_id: menuRoleMenu.id,
          access: true,
          create: true,
          update: true,
          delete: true,
          approval: false,
          approval_2: false,
          approval_3: false,
        },
      ],
      skipDuplicates: true,
    });

    // User - menggunakan upsert untuk idempotency
    const hashedPassword = await bcrypt.hash(passAdmin, 10);

    await tx.user.upsert({
      where: { email: emailAdmin },
      update: {
        name: 'Admin',
        password: hashedPassword,
        gender: 'Male',
        birthdate: new Date('2001-01-01'),
        active: 'Active',
        role_id: roleAdmin.id,
      },
      create: {
        name: 'Admin',
        email: emailAdmin,
        password: hashedPassword,
        gender: 'Male',
        birthdate: new Date('2001-01-01'),
        active: 'Active',
        role_id: roleAdmin.id,
        created_by: 0,
      },
    });
  }

  /**
   * Seed database langsung via Prisma (optimized, tidak menggunakan execSync)
   */
  static async seedDatabase() {
    const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';
    const passAdmin = process.env.PASS_ADMIN || 'admin123';

    // menu
    const menuAppManagement = await prismaClient.menu.create({
      data: {
        key_menu: 'appmanagement',
        name: 'App Management',
        order_number: 1,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuUser = await prismaClient.menu.create({
      data: {
        key_menu: 'user',
        name: 'User',
        order_number: 1,
        url: '/app-management/user',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuRole = await prismaClient.menu.create({
      data: {
        key_menu: 'role',
        name: 'Role',
        order_number: 2,
        url: '/app-management/role',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuMenu = await prismaClient.menu.create({
      data: {
        key_menu: 'menu',
        name: 'Menu',
        order_number: 3,
        url: '/app-management/menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    const menuRoleMenu = await prismaClient.menu.create({
      data: {
        key_menu: 'rolemenu',
        name: 'Role Menu',
        order_number: 4,
        url: '/app-management/role-menu',
        menu_id: menuAppManagement.id,
        active: 'Active',
        created_by: 0,
      },
    });

    // role
    const roleAdmin = await prismaClient.role.create({
      data: {
        name: 'Super Admin',
        created_by: 0,
      },
    });

    // role menu
    await prismaClient.roleMenu.create({
      data: {
        role_id: roleAdmin.id,
        menu_id: menuAppManagement.id,
        access: true,
      },
    });

    await prismaClient.roleMenu.create({
      data: {
        role_id: roleAdmin.id,
        menu_id: menuUser.id,
        access: true,
        create: true,
        update: true,
        delete: true,
        approval: false,
        approval_2: false,
        approval_3: false,
      },
    });

    await prismaClient.roleMenu.create({
      data: {
        role_id: roleAdmin.id,
        menu_id: menuRole.id,
        access: true,
        create: true,
        update: true,
        delete: true,
        approval: false,
        approval_2: false,
        approval_3: false,
      },
    });

    await prismaClient.roleMenu.create({
      data: {
        role_id: roleAdmin.id,
        menu_id: menuMenu.id,
        access: true,
        create: true,
        update: true,
        delete: true,
        approval: false,
        approval_2: false,
        approval_3: false,
      },
    });

    await prismaClient.roleMenu.create({
      data: {
        role_id: roleAdmin.id,
        menu_id: menuRoleMenu.id,
        access: true,
        create: true,
        update: true,
        delete: true,
        approval: false,
        approval_2: false,
        approval_3: false,
      },
    });

    // User
    const hashedPassword = await bcrypt.hash(passAdmin, 10);

    await prismaClient.user.create({
      data: {
        name: 'Admin',
        email: emailAdmin,
        password: hashedPassword,
        gender: 'Male',
        birthdate: new Date('2001-01-01'),
        active: 'Active',
        role_id: roleAdmin.id,
        created_by: 0,
      },
    });
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
      console.error(
        '❌ Error cleaning up database:',
        error instanceof Error ? error.message : String(error),
      );
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
      await TestHelper.seedDatabase();
    } catch (error: any) {
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
