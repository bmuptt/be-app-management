import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu List Header Business Flow', () => {
  let cookieHeader: string | null;

  beforeEach(async () => {
    // Increase timeout for database operations
    jest.setTimeout(30000);
    // Migrate dan seed ulang database untuk setiap test case
    await TestHelper.refreshDatabase();

    const responseLogin = await AuthLogic.getLoginSuperAdmin();
    expect(responseLogin.status).toBe(200);

    const cookies = responseLogin.headers['set-cookie'];
    cookieHeader = Array.isArray(cookies) ? cookies.join('; ') : cookies;
  });

  afterEach(async () => {
    // Cleanup database setelah test
    await TestHelper.cleanupDatabase();
  });

  it('Should handle complete list header menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: GET MENU LIST HEADER =====
    console.log('🧪 Testing get menu list header...');

    const headerResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    expect(headerResponse.status).toBe(200);
    expect(headerResponse.body).toHaveProperty('data');
    expect(Array.isArray(headerResponse.body.data)).toBe(true);

    // ===== TEST 2: VERIFY HEADER FORMAT =====
    console.log('🧪 Testing verify header format...');

    if (headerResponse.body.data.length > 0) {
      const menu = headerResponse.body.data[0];
      expect(menu).toHaveProperty('id');
      expect(menu).toHaveProperty('key_menu');
      expect(menu).toHaveProperty('name');
      expect(menu).toHaveProperty('url');
      expect(menu).toHaveProperty('order_number');
      expect(menu).toHaveProperty('active');
      expect(menu).toHaveProperty('menu_id');
    }

    // ===== TEST 3: VERIFY RETURNED MENUS =====
    console.log('🧪 Testing verify returned menus...');

    // listHeader returns all menus except the one specified in the ID parameter
    // When called with ID 0 (non-existent), it returns all menus
    expect(headerResponse.body.data.length).toBeGreaterThan(0);

    // Verify that none of the returned menus have ID 0 (since we excluded it)
    headerResponse.body.data.forEach((menu: any) => {
      expect(menu.id).not.toBe(0);
    });

    // ===== TEST 4: VERIFY MENU PROPERTIES =====
    console.log('🧪 Testing verify menu properties...');

    // Verify that returned menus have the expected properties
    headerResponse.body.data.forEach((menu: any) => {
      expect(menu).toHaveProperty('active');
      expect(['Active', 'Inactive']).toContain(menu.active);
    });

    // ===== TEST 5: VERIFY ORDERING =====
    console.log('🧪 Testing verify ordering...');

    // Verify that menus are ordered by ID descending (default order for listHeader)
    if (headerResponse.body.data.length > 1) {
      for (let i = 0; i < headerResponse.body.data.length - 1; i++) {
        expect(headerResponse.body.data[i].id).toBeGreaterThanOrEqual(
          headerResponse.body.data[i + 1].id,
        );
      }
    }

    // ===== TEST 6: CREATE AND VERIFY NEW MENU IN LIST =====
    console.log('🧪 Testing create and verify new menu in list...');

    // Create a new menu
    const newMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'new-list-menu',
        name: 'New List Menu',
      });

    expect(newMenuResponse.status).toBe(200);
    const newMenuId = newMenuResponse.body.data.id;

    // Get updated list
    const updatedListResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    expect(updatedListResponse.status).toBe(200);
    expect(updatedListResponse.body.data).toBeDefined();

    // Verify new menu is in list
    const newMenu = updatedListResponse.body.data.find(
      (menu: any) => menu.id === newMenuId,
    );
    expect(newMenu).toBeDefined();
    expect(newMenu.key_menu).toBe('new-list-menu');
    expect(newMenu.name).toBe('New List Menu');
    expect(newMenu.menu_id).toBeNull();
    expect(newMenu.active).toBe('Active');

    // ===== TEST 7: VERIFY MENU EXCLUSION =====
    console.log('🧪 Testing verify menu exclusion...');

    // Create a parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-header-menu',
        name: 'Parent Header Menu',
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create a submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu-header-menu',
        name: 'Submenu Header Menu',
        menu_id: parentId,
      });

    expect(submenuResponse.status).toBe(200);
    const submenuId = submenuResponse.body.data.id;

    // Get header excluding the parent menu
    const submenuHeaderResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}/list-header`)
      .set('Cookie', cookieHeader ?? '');

    expect(submenuHeaderResponse.status).toBe(200);

    // Verify parent is not included (since we excluded it by ID)
    const parentInHeader = submenuHeaderResponse.body.data.find(
      (menu: any) => menu.id === parentId,
    );
    expect(parentInHeader).toBeUndefined();

    // Verify submenu is included (since it wasn't excluded)
    const submenuInHeader = submenuHeaderResponse.body.data.find(
      (menu: any) => menu.id === submenuId,
    );
    expect(submenuInHeader).toBeDefined();

    // ===== TEST 8: VERIFY INACTIVE MENUS STILL IN HEADER =====
    console.log('🧪 Testing verify inactive menus still in header...');

    // Create a menu to deactivate
    const inactiveMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'inactive-header-menu',
        name: 'Inactive Header Menu',
      });

    expect(inactiveMenuResponse.status).toBe(200);
    const inactiveMenuId = inactiveMenuResponse.body.data.id;

    // Deactivate the menu
    const deactivateResponse = await supertest(web)
      .delete(`${baseUrlTest}/${inactiveMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateResponse.status).toBe(200);

    // Get header and verify inactive menu is still included (listHeader doesn't filter by active status)
    const inactiveHeaderResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    expect(inactiveHeaderResponse.status).toBe(200);

    const inactiveMenuInHeader = inactiveHeaderResponse.body.data.find(
      (menu: any) => menu.id === inactiveMenuId,
    );
    expect(inactiveMenuInHeader).toBeDefined();
    expect(inactiveMenuInHeader.active).toBe('Inactive');

    // ===== TEST 9: HEADER WITH QUERY PARAMETERS =====
    console.log('🧪 Testing header with query parameters...');

    const queryHeaderResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header?include=extra&limit=5`)
      .set('Cookie', cookieHeader ?? '');

    expect(queryHeaderResponse.status).toBe(200);
    expect(queryHeaderResponse.body.data).toBeDefined();
    expect(Array.isArray(queryHeaderResponse.body.data)).toBe(true);

    // ===== TEST 10: CONCURRENT HEADER REQUESTS =====
    console.log('🧪 Testing concurrent header requests...');

    // Make concurrent header requests
    const concurrentPromises = Array(5)
      .fill(null)
      .map(() =>
        supertest(web)
          .get(`${baseUrlTest}/0/list-header`)
          .set('Cookie', cookieHeader ?? ''),
      );

    const concurrentResponses = await Promise.all(concurrentPromises);

    concurrentResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.data).toBeDefined();
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    // ===== TEST 11: HEADER RESPONSE PERFORMANCE =====
    console.log('🧪 Testing header response performance...');

    const startTime = Date.now();
    const performanceResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    const endTime = Date.now();
    const responseTime = endTime - startTime;

    expect(performanceResponse.status).toBe(200);
    expect(responseTime).toBeLessThan(3000); // Should respond within 3 seconds

    // ===== TEST 12: HEADER WITH LARGE DATASET =====
    console.log('🧪 Testing header with large dataset...');

    // Create many root level menus to test performance
    const largeDatasetPromises = Array(10)
      .fill(null)
      .map((_, index) =>
        supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            key_menu: `large-header-menu-${index + 1}`,
            name: `Large Header Menu ${index + 1}`,
          }),
      );

    const largeDatasetResponses = await Promise.all(largeDatasetPromises);
    largeDatasetResponses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // Get header with large dataset
    const largeHeaderResponse = await supertest(web)
      .get(`${baseUrlTest}/0/list-header`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeHeaderResponse.status).toBe(200);
    expect(largeHeaderResponse.body.data.length).toBeGreaterThanOrEqual(10);

    // ===== TEST 13: VERIFY HEADER DATA TYPES =====
    console.log('🧪 Testing verify header data types...');

    // Verify that all header menus have correct data types
    largeHeaderResponse.body.data.forEach((menu: any) => {
      expect(typeof menu.id).toBe('number');
      expect(typeof menu.key_menu).toBe('string');
      expect(typeof menu.name).toBe('string');
      expect(menu.url === null || typeof menu.url === 'string').toBe(true);
      expect(typeof menu.order_number).toBe('number');
      expect(typeof menu.active).toBe('string');
      // menu_id can be null or number (for child menus)
      expect(menu.menu_id === null || typeof menu.menu_id === 'number').toBe(
        true,
      );
    });

    // ===== TEST 14: VERIFY HEADER CONSISTENCY =====
    console.log('🧪 Testing verify header consistency...');

    // Make multiple requests to verify consistency
    const consistencyPromises = Array(3)
      .fill(null)
      .map(() =>
        supertest(web)
          .get(`${baseUrlTest}/0/list-header`)
          .set('Cookie', cookieHeader ?? ''),
      );

    const consistencyResponses = await Promise.all(consistencyPromises);

    // Verify all responses have the same number of items
    const responseLengths = consistencyResponses.map(
      (response) => response.body.data.length,
    );
    const firstLength = responseLengths[0];
    responseLengths.forEach((length) => {
      expect(length).toBe(firstLength);
    });

    // ===== TEST 15: VERIFY HEADER UNIQUENESS =====
    console.log('🧪 Testing verify header uniqueness...');

    // Verify that all menu IDs in header are unique
    const menuIds = largeHeaderResponse.body.data.map((menu: any) => menu.id);
    const uniqueIds = new Set(menuIds);
    expect(uniqueIds.size).toBe(menuIds.length);

    // Verify that all key_menu values are unique
    const keyMenus = largeHeaderResponse.body.data.map(
      (menu: any) => menu.key_menu,
    );
    const uniqueKeyMenus = new Set(keyMenus);
    expect(uniqueKeyMenus.size).toBe(keyMenus.length);

    console.log('✅ All list header menu flow tests completed successfully');
  });
});
