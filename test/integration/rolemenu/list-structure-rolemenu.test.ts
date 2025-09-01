import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/role-menu';
const baseUrlMenuTest = '/api/app-management/menu';

describe('Role Menu List Structure Business Flow', () => {
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

  it('Should handle complete role menu structure flow including creation, configuration, and validation', async () => {
    jest.setTimeout(30000);

    // ===== TEST 1: GET INITIAL ROLE MENU STRUCTURE =====
    console.log('🧪 Testing get initial role menu structure...');

    const initialResponse = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    console.log('Initial role menu response status:', initialResponse.status);
    expect(initialResponse.status).toBe(200);
    expect(initialResponse.body).toHaveProperty('data');
    expect(Array.isArray(initialResponse.body.data)).toBe(true);
    expect(initialResponse.body.data.length).toBeGreaterThan(0);
    expect(initialResponse.body.data[0].key_menu).toBe('appmanagement');

    // Verify response structure
    const firstItem = initialResponse.body.data[0];
    expect(firstItem).toHaveProperty('id');
    expect(firstItem).toHaveProperty('key_menu');
    expect(firstItem).toHaveProperty('name');
    expect(firstItem).toHaveProperty('active');
    expect(firstItem).toHaveProperty('order_number');
    expect(firstItem).toHaveProperty('menu_id');
    expect(firstItem).toHaveProperty('url');
    expect(firstItem).toHaveProperty('permissions');
    expect(firstItem).toHaveProperty('children');
    expect(Array.isArray(firstItem.children)).toBe(true);

    // Check permissions structure
    expect(firstItem.permissions).toHaveProperty('access');
    expect(firstItem.permissions).toHaveProperty('create');
    expect(firstItem.permissions).toHaveProperty('update');
    expect(firstItem.permissions).toHaveProperty('delete');
    expect(firstItem.permissions).toHaveProperty('approval');
    expect(firstItem.permissions).toHaveProperty('approval_2');
    expect(firstItem.permissions).toHaveProperty('approval_3');

    console.log('✅ Initial role menu structure verified successfully');

    // ===== TEST 2: CREATE NEW MENU AND CONFIGURE ROLE MENU =====
    console.log('🧪 Testing create menu and configure role menu...');

    const createMenuResponse = await supertest(web)
      .post(baseUrlMenuTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-structure',
        name: 'Test Menu Structure',
      });

    expect(createMenuResponse.status).toBe(200);
    expect(createMenuResponse.body.data).toHaveProperty('id');
    const menuId = createMenuResponse.body.data.id;

    // Configure role menu with different permissions
    const configureResponse = await supertest(web)
      .post(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '')
      .send([
        {
          menu_id: menuId,
          access: true,
          create: true,
          update: true,
        },
      ]);

    expect(configureResponse.status).toBe(200);
    expect(configureResponse.body).toHaveProperty('data');

    console.log('✅ Menu created and role menu configured successfully');

    // ===== TEST 3: VERIFY UPDATED ROLE MENU STRUCTURE =====
    console.log('🧪 Testing verify updated role menu structure...');

    const updatedResponse = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(updatedResponse.status).toBe(200);
    expect(updatedResponse.body).toHaveProperty('data');
    expect(Array.isArray(updatedResponse.body.data)).toBe(true);
    expect(updatedResponse.body.data.length).toBeGreaterThan(0);

    console.log('✅ Updated role menu structure verified successfully');

    // ===== TEST 4: TEST ERROR HANDLING =====
    console.log('🧪 Testing error handling...');

    // Test non-existent role
    const nonExistentRoleResponse = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentRoleResponse.status).toBe(404);
    expect(nonExistentRoleResponse.body.errors).toEqual(
      expect.arrayContaining(['The role does not exist!']),
    );

    // Test invalid role ID format
    const invalidRoleResponse = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidRoleResponse.status).toBe(500);
    expect(invalidRoleResponse.body.errors).toBeDefined();

    console.log('✅ Error handling verified successfully');

    // ===== TEST 5: VERIFY HIERARCHICAL STRUCTURE =====
    console.log('🧪 Testing hierarchical menu structure...');

    const hierarchicalResponse = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(hierarchicalResponse.status).toBe(200);
    expect(hierarchicalResponse.body).toHaveProperty('data');
    expect(Array.isArray(hierarchicalResponse.body.data)).toBe(true);

    if (hierarchicalResponse.body.data.length > 0) {
      const firstItemHierarchy = hierarchicalResponse.body.data[0];
      expect(firstItemHierarchy).toHaveProperty('children');
      expect(Array.isArray(firstItemHierarchy.children)).toBe(true);

      // Check if children have the correct structure
      if (firstItemHierarchy.children.length > 0) {
        const firstChild = firstItemHierarchy.children[0];
        expect(firstChild).toHaveProperty('id');
        expect(firstChild).toHaveProperty('key_menu');
        expect(firstChild).toHaveProperty('name');
        expect(firstChild).toHaveProperty('active');
        expect(firstChild).toHaveProperty('permissions');
        expect(firstChild).toHaveProperty('children');
        expect(Array.isArray(firstChild.children)).toBe(true);
      }
    }

    // Verify only active menus are returned
    const checkActiveMenus = (menus: any[]) => {
      for (const menu of menus) {
        expect(menu.active).toBe('Active');
        if (menu.children && menu.children.length > 0) {
          checkActiveMenus(menu.children);
        }
      }
    };

    checkActiveMenus(hierarchicalResponse.body.data);

    console.log('✅ Hierarchical structure verified successfully');

    // ===== TEST 6: TEST CONSISTENCY ACROSS MULTIPLE REQUESTS =====
    console.log('🧪 Testing consistency across multiple requests...');

    const consistencyResponse1 = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    const consistencyResponse2 = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(consistencyResponse1.status).toBe(200);
    expect(consistencyResponse2.status).toBe(200);
    expect(consistencyResponse1.body.data.length).toBe(
      consistencyResponse2.body.data.length,
    );

    if (consistencyResponse1.body.data.length > 0) {
      expect(consistencyResponse1.body.data[0]).toHaveProperty('key_menu');
      expect(consistencyResponse2.body.data[0]).toHaveProperty('key_menu');
      expect(consistencyResponse1.body.data[0].key_menu).toBe(
        consistencyResponse2.body.data[0].key_menu,
      );
    }

    console.log('✅ Consistency across requests verified successfully');
    console.log(
      '🎉 All role menu list structure flow tests completed successfully!',
    );
  });
});
