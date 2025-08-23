import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Detail Business Flow', () => {
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

  it('Should handle complete menu detail flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU DETAIL RETRIEVAL =====
    console.log('🧪 Testing successful menu detail retrieval...');
    
    // Create a test menu first
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu'
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Get menu detail
    const detailResponse = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(detailResponse.status).toBe(200);
    expect(detailResponse.body.data).toBeDefined();
    expect(detailResponse.body.data.id).toBe(menuId);
    expect(detailResponse.body.data.key_menu).toBe('test-menu');
    expect(detailResponse.body.data.name).toBe('Test Menu');
    expect(detailResponse.body.data.menu_id).toBe(null);
    expect(detailResponse.body.data.active).toBe('Active');
    expect(detailResponse.body.data.created_at).toBeDefined();
    expect(detailResponse.body.data.updated_at).toBeDefined();

    // ===== TEST 2: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing non-existent menu ID...');
    
    const nonExistentResponse = await supertest(web)
      .get(`${baseUrlTest}/999/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toBeDefined();

    // ===== TEST 3: NEGATIVE MENU ID =====
    console.log('🧪 Testing negative menu ID...');
    
    const negativeIdResponse = await supertest(web)
      .get(`${baseUrlTest}/-1/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeIdResponse.status).toBe(404);
    expect(negativeIdResponse.body.errors).toBeDefined();

    // ===== TEST 4: ZERO MENU ID =====
    console.log('🧪 Testing zero menu ID...');
    
    const zeroIdResponse = await supertest(web)
      .get(`${baseUrlTest}/0/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroIdResponse.status).toBe(404);
    expect(zeroIdResponse.body.errors).toBeDefined();

    // ===== TEST 5: VERY LARGE MENU ID =====
    console.log('🧪 Testing very large menu ID...');
    
    const largeIdResponse = await supertest(web)
      .get(`${baseUrlTest}/999999999999/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeIdResponse.status).toBe(500);
    expect(largeIdResponse.body.errors).toBeDefined();

    // ===== TEST 6: DECIMAL MENU ID =====
    console.log('🧪 Testing decimal menu ID...');
    
    const decimalIdResponse = await supertest(web)
      .get(`${baseUrlTest}/999.5/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(decimalIdResponse.status).toBe(404);
    expect(decimalIdResponse.body.errors).toBeDefined();

    // ===== TEST 7: INVALID MENU ID FORMAT =====
    console.log('🧪 Testing invalid menu ID format...');
    
    const invalidIdResponse = await supertest(web)
      .get(`${baseUrlTest}/invalid/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidIdResponse.status).toBe(500);
    expect(invalidIdResponse.body.errors).toBeDefined();

    // ===== TEST 8: MENU WITH SUBMENUS =====
    console.log('🧪 Testing menu with submenus...');
    
    // Create parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu'
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: parentId
      });

    expect(submenuResponse.status).toBe(200);
    const submenuId = submenuResponse.body.data.id;

    // Get parent menu detail
    const parentDetailResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(parentDetailResponse.status).toBe(200);
    expect(parentDetailResponse.body.data.id).toBe(parentId);
    expect(parentDetailResponse.body.data.key_menu).toBe('parent-menu');
    expect(parentDetailResponse.body.data.name).toBe('Parent Menu');
    expect(parentDetailResponse.body.data.menu_id).toBe(null);

    // Get submenu detail
    const submenuDetailResponse = await supertest(web)
      .get(`${baseUrlTest}/${submenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(submenuDetailResponse.status).toBe(200);
    expect(submenuDetailResponse.body.data.id).toBe(submenuId);
    expect(submenuDetailResponse.body.data.key_menu).toBe('submenu');
    expect(submenuDetailResponse.body.data.name).toBe('Submenu');
    expect(submenuDetailResponse.body.data.menu_id).toBe(parentId);

    // ===== TEST 9: INACTIVE MENU =====
    console.log('🧪 Testing inactive menu...');
    
    // Create a test menu for deactivation
    const inactiveMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'inactive-menu',
        name: 'Inactive Menu'
      });

    expect(inactiveMenuResponse.status).toBe(200);
    const inactiveMenuId = inactiveMenuResponse.body.data.id;

    // Deactivate the menu
    const deactivateResponse = await supertest(web)
      .delete(`${baseUrlTest}/${inactiveMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateResponse.status).toBe(200);

    // Get menu detail (should still work even if inactive)
    const inactiveDetailResponse = await supertest(web)
      .get(`${baseUrlTest}/${inactiveMenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(inactiveDetailResponse.status).toBe(200);
    expect(inactiveDetailResponse.body.data.id).toBe(inactiveMenuId);
    expect(inactiveDetailResponse.body.data.active).toBe('Inactive');

    // ===== TEST 10: RESPONSE STRUCTURE VALIDATION =====
    console.log('🧪 Testing response structure validation...');
    
    // Create a test menu for structure validation
    const structureMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'structure-menu',
        name: 'Structure Menu'
      });

    expect(structureMenuResponse.status).toBe(200);
    const structureMenuId = structureMenuResponse.body.data.id;

    // Get menu detail
    const structureResponse = await supertest(web)
      .get(`${baseUrlTest}/${structureMenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body).not.toHaveProperty('errors');
    
    const menuData = structureResponse.body.data;
    expect(menuData).toHaveProperty('id');
    expect(menuData).toHaveProperty('key_menu');
    expect(menuData).toHaveProperty('name');
    expect(menuData).toHaveProperty('menu_id');
    expect(menuData).toHaveProperty('order_number');
    expect(menuData).toHaveProperty('active');
    expect(menuData).toHaveProperty('created_at');
    expect(menuData).toHaveProperty('updated_at');

    // ===== TEST 11: MULTIPLE DETAIL REQUESTS FOR SAME MENU =====
    console.log('🧪 Testing multiple detail requests for same menu...');
    
    // Create a test menu for multiple requests
    const multipleMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'multiple-menu',
        name: 'Multiple Menu'
      });

    expect(multipleMenuResponse.status).toBe(200);
    const multipleMenuId = multipleMenuResponse.body.data.id;

    // Make multiple detail requests
    const response1 = await supertest(web)
      .get(`${baseUrlTest}/${multipleMenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .get(`${baseUrlTest}/${multipleMenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .get(`${baseUrlTest}/${multipleMenuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body.data.id).toBe(response2.body.data.id);
    expect(response2.body.data.id).toBe(response3.body.data.id);

    console.log('✅ All menu detail flow tests completed successfully');
  });
});
