import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';
import { prismaClient } from '../../../src/config/database';

dotenv.config();

const baseUrlTest = '/api/app-management/role-menu';
const baseUrlMenuTest = '/api/app-management/menu';

describe('Role Menu Store Business Flow', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    jest.setTimeout(30000);
    await TestHelper.refreshDatabase();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    const cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete role menu store flow including creation, configuration, validation, and error handling', async () => {
    jest.setTimeout(30000);

    // ===== TEST 1: CREATE TEST MENU FOR CONFIGURATION =====
    console.log('🧪 Testing create test menu for configuration...');
    
    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createMenuResponse.status).toBe(200);
    expect(createMenuResponse.body.data).toHaveProperty('id');
    const menuId = createMenuResponse.body.data.id;
    
    console.log('✅ Test menu created successfully with ID:', menuId);

    // ===== TEST 2: STORE BASIC ROLE MENU CONFIGURATION =====
    console.log('🧪 Testing store basic role menu configuration...');
    
    const basicConfigResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
        },
      ]);

    expect(basicConfigResponse.status).toBe(200);
    expect(basicConfigResponse.body).toHaveProperty('data');
    
    console.log('✅ Basic role menu configuration stored successfully');

    // ===== TEST 3: CREATE MULTIPLE MENUS AND STORE MULTIPLE CONFIGURATIONS =====
    console.log('🧪 Testing create multiple menus and store multiple configurations...');
    
    const menuIds: number[] = [menuId]; // Include the first menu
    for (let i = 2; i <= 3; i++) {
      const createMultiMenuResponse = await supertest(web)
        .post(baseUrlMenuTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: `test-menu-${i}`,
          name: `Test Menu ${i}`
        });

      expect(createMultiMenuResponse.status).toBe(200);
      menuIds.push(createMultiMenuResponse.body.data.id);
    }

    // Store multiple menu configurations with different permissions
    const multipleConfigResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuIds[0],
          access: true,
        },
        {
          menu_id: menuIds[1],
          access: true,
          create: true,
        },
        {
          menu_id: menuIds[2],
          access: true,
          update: true,
          delete: true,
        },
      ]);

    expect(multipleConfigResponse.status).toBe(200);
    expect(multipleConfigResponse.body).toHaveProperty('data');
    
    console.log('✅ Multiple role menu configurations stored successfully');

    // ===== TEST 4: TEST DIFFERENT PERMISSION COMBINATIONS =====
    console.log('🧪 Testing different permission combinations...');
    
    const createPermMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-permissions',
        name: 'Test Menu Permissions'
      });

    expect(createPermMenuResponse.status).toBe(200);
    const permMenuId = createPermMenuResponse.body.data.id;

    // Test different permission combinations
    const permissionCombinations = [
      { access: true },
      { access: true, create: true },
      { access: true, update: true },
      { access: true, delete: true },
      { access: true, create: true, update: true },
      { access: true, create: true, update: true, delete: true },
    ];

    for (let i = 0; i < permissionCombinations.length; i++) {
      const permissions = permissionCombinations[i];
      const permResponse = await supertest(web)
        .post(`${baseUrlTest}/1`)
        .set('Cookie', cookieHeader ?? '')
        .send([
          {
            menu_id: permMenuId,
            ...permissions,
          },
        ]);

      expect(permResponse.status).toBe(200);
      expect(permResponse.body).toHaveProperty('data');
    }
    
    console.log('✅ Different permission combinations tested successfully');

    // ===== TEST 5: VERIFY NO DUPLICATE ENTRIES =====
    console.log('🧪 Testing verify no duplicate entries...');
    
    const createDuplicateMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-duplicate',
        name: 'Test Menu Duplicate'
      });

    expect(createDuplicateMenuResponse.status).toBe(200);
    const duplicateMenuId = createDuplicateMenuResponse.body.data.id;

    // Store role menu configuration multiple times
    const duplicateResponse1 = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: duplicateMenuId,
          access: true,
          create: true,
        },
      ]);

    const duplicateResponse2 = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: duplicateMenuId,
          access: true,
          create: true,
        },
      ]);

    expect(duplicateResponse1.status).toBe(200);
    expect(duplicateResponse2.status).toBe(200);

    // Verify no duplicate entries in database
    const roleMenus = await prismaClient.roleMenu.findMany({
      where: {
        role_id: 1,
        menu_id: duplicateMenuId
      }
    });

    expect(roleMenus.length).toBe(1);
    
    console.log('✅ No duplicate entries verified successfully');

    // ===== TEST 6: TEST ERROR HANDLING =====
    console.log('🧪 Testing error handling...');
    
    // Test non-existent role
    const nonExistentRoleResponse = await supertest(web)
      .post(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
        },
      ]);

    expect(nonExistentRoleResponse.status).toBe(404);
    expect(nonExistentRoleResponse.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );

    // Test non-existent menu
    const nonExistentMenuResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 999999,
          access: true,
        },
      ]);

    expect(nonExistentMenuResponse.status).toBe(404);
    expect(nonExistentMenuResponse.body.errors).toEqual(
      expect.arrayContaining(['Role or Menu not found!'])
    );

    // Test invalid menu data structure
    const invalidDataResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: 'invalid',
          access: true,
        },
      ]);

    expect(invalidDataResponse.status).toBe(500);
    expect(invalidDataResponse.body.errors).toBeDefined();

    // Test invalid role ID format
    const invalidRoleResponse = await supertest(web)
      .post(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
        },
      ]);

    expect(invalidRoleResponse.status).toBe(500);
    expect(invalidRoleResponse.body.errors).toBeDefined();
    
    console.log('✅ Error handling verified successfully');

    // ===== TEST 7: TEST EMPTY ARRAY HANDLING =====
    console.log('🧪 Testing empty array handling...');
    
    const emptyArrayResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([]);

    expect(emptyArrayResponse.status).toBe(200);
    expect(emptyArrayResponse.body).toHaveProperty('data');
    
    console.log('✅ Empty array handling verified successfully');
    console.log('🎉 All role menu store flow tests completed successfully!');
  });

});
