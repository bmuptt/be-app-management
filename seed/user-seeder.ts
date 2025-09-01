import { prismaClient } from '../src/config/database';
import bcrypt from 'bcrypt';

const emailAdmin = process.env.EMAIL_ADMIN || 'admin@gmail.com';
const passAdmin = process.env.PASS_ADMIN || 'admin123';

async function main() {
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

  // Contoh seeder untuk menambahkan beberapa user
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

  console.log('Seeder executed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prismaClient.$disconnect();
  });
