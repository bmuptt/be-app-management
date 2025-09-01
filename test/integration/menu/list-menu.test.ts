import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('List Menu Business Flow', () => {
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

  it('Should handle complete list menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: LIST ROOT MENUS (id=0) =====
    console.log('🧪 Testing list root menus...');

    const rootResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(rootResponse.status).toBe(200);
    expect(rootResponse.body).toHaveProperty('data');
    expect(Array.isArray(rootResponse.body.data)).toBe(true);
    expect(rootResponse.body.data.length).toBeGreaterThan(0);

    // Check if menus have children property
    if (rootResponse.body.data.length > 0) {
      expect(rootResponse.body.data[0]).toHaveProperty('children');
      expect(Array.isArray(rootResponse.body.data[0].children)).toBe(true);
    }

    // ===== TEST 2: LIST SUBMENUS FOR EXISTING PARENT =====
    console.log('🧪 Testing list submenus for existing parent...');

    // First create a parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu',
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create some submenus
    const submenu1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu1',
        name: 'Submenu 1',
        menu_id: parentId,
      });

    expect(submenu1Response.status).toBe(200);

    const submenu2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu2',
        name: 'Submenu 2',
        menu_id: parentId,
      });

    expect(submenu2Response.status).toBe(200);

    // List submenus
    const submenuListResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(submenuListResponse.status).toBe(200);
    expect(submenuListResponse.body.data.length).toBe(2);
    expect(submenuListResponse.body.data[0].key_menu).toBe('submenu1');
    expect(submenuListResponse.body.data[1].key_menu).toBe('submenu2');

    // ===== TEST 3: RETURN EMPTY ARRAY FOR NON-EXISTENT PARENT =====
    console.log('🧪 Testing list for non-existent parent...');

    const nonExistentResponse = await supertest(web)
      .get(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(200);
    expect(Array.isArray(nonExistentResponse.body.data)).toBe(true);
    expect(nonExistentResponse.body.data.length).toBe(0);

    // ===== TEST 4: LIST WITH QUERY PARAMETERS =====
    console.log('🧪 Testing list with query parameters...');

    const queryResponse = await supertest(web)
      .get(`${baseUrlTest}/0?include=children&limit=5`)
      .set('Cookie', cookieHeader ?? '');

    expect(queryResponse.status).toBe(200);
    expect(queryResponse.body).toHaveProperty('data');
    expect(Array.isArray(queryResponse.body.data)).toBe(true);

    // ===== TEST 5: LIST WITH INVALID PARENT ID FORMAT =====
    console.log('🧪 Testing list with invalid parent ID format...');

    const invalidIdResponse = await supertest(web)
      .get(`${baseUrlTest}/invalid-id`)
      .set('Cookie', cookieHeader ?? '');

    // API returns empty array for invalid ID format
    expect(invalidIdResponse.status).toBe(200);
    expect(Array.isArray(invalidIdResponse.body.data)).toBe(true);
    expect(invalidIdResponse.body.data.length).toBe(0);

    // ===== TEST 6: LIST WITH NEGATIVE PARENT ID =====
    console.log('🧪 Testing list with negative parent ID...');

    const negativeIdResponse = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    // API treats -1 as a valid number and returns empty array (no menus with parent_id = -1)
    expect(negativeIdResponse.status).toBe(200);
    expect(Array.isArray(negativeIdResponse.body.data)).toBe(true);
    expect(negativeIdResponse.body.data.length).toBe(0);

    // ===== TEST 7: LIST WITH DEEP NESTED STRUCTURE =====
    console.log('🧪 Testing list with deep nested structure...');

    // Create a deep nested structure
    const level1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level1',
        name: 'Level 1 Menu',
      });

    expect(level1Response.status).toBe(200);
    const level1Id = level1Response.body.data.id;

    const level2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level2',
        name: 'Level 2 Menu',
        menu_id: level1Id,
      });

    expect(level2Response.status).toBe(200);
    const level2Id = level2Response.body.data.id;

    const level3Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level3',
        name: 'Level 3 Menu',
        menu_id: level2Id,
      });

    expect(level3Response.status).toBe(200);

    // List level 1 (should include children)
    const level1ListResponse = await supertest(web)
      .get(`${baseUrlTest}/${level1Id}`)
      .set('Cookie', cookieHeader ?? '');

    expect(level1ListResponse.status).toBe(200);
    expect(level1ListResponse.body.data.length).toBe(1);
    expect(level1ListResponse.body.data[0].key_menu).toBe('level2');

    // ===== TEST 8: LIST WITH LARGE NUMBER OF MENUS =====
    console.log('🧪 Testing list with large number of menus...');

    // Create multiple menus under root
    const largeMenuPromises = Array(5)
      .fill(null)
      .map((_, index) =>
        supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            key_menu: `large-menu-${index + 1}`,
            name: `Large Menu ${index + 1}`,
          }),
      );

    const largeMenuResponses = await Promise.all(largeMenuPromises);
    largeMenuResponses.forEach((response) => {
      expect(response.status).toBe(200);
    });

    // List root menus again to verify all are included
    const finalRootResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(finalRootResponse.status).toBe(200);
    expect(finalRootResponse.body.data.length).toBeGreaterThan(5);

    console.log('✅ All list menu flow tests completed successfully');
  });
});
