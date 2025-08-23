import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Delete Business Flow', () => {
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

  it('Should handle complete delete menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU DELETE =====
    console.log('🧪 Testing successful menu delete...');
    
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

    // Delete the menu (set to inactive)
    const deleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deleteResponse.status).toBe(200);
    expect(deleteResponse.body.data.active).toBe('Inactive');
    expect(deleteResponse.body.data.id).toBe(menuId);

    // ===== TEST 2: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing non-existent menu ID...');
    
    const nonExistentResponse = await supertest(web)
      .delete(`${baseUrlTest}/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain("The menu does not exist!");

    // ===== TEST 3: NEGATIVE MENU ID =====
    console.log('🧪 Testing negative menu ID...');
    
    const negativeIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeIdResponse.status).toBe(404);
    expect(negativeIdResponse.body.errors).toContain("The menu does not exist!");

    // ===== TEST 4: ZERO MENU ID =====
    console.log('🧪 Testing zero menu ID...');
    
    const zeroIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroIdResponse.status).toBe(404);
    expect(zeroIdResponse.body.errors).toContain("The menu does not exist!");

    // ===== TEST 5: VERY LARGE MENU ID =====
    console.log('🧪 Testing very large menu ID...');
    
    const largeIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeIdResponse.status).toBe(500);
    expect(largeIdResponse.body.errors).toBeDefined();

    // ===== TEST 6: DECIMAL MENU ID =====
    console.log('🧪 Testing decimal menu ID...');
    
    const decimalIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/1.5`)
      .set('Cookie', cookieHeader ?? '');

    expect(decimalIdResponse.status).toBe(200);
    expect(decimalIdResponse.body.data.active).toBe('Inactive');

    // ===== TEST 7: INVALID MENU ID FORMAT =====
    console.log('🧪 Testing invalid menu ID format...');
    
    const invalidIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidIdResponse.status).toBe(500);
    expect(invalidIdResponse.body.errors).toBeDefined();

    // ===== TEST 8: DELETE MENU WITH SUBMENUS =====
    console.log('🧪 Testing delete menu with submenus...');
    
    // Create a parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu'
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create a submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: parentId
      });

    expect(submenuResponse.status).toBe(200);

    // Delete the parent menu
    const parentDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(parentDeleteResponse.status).toBe(200);
    expect(parentDeleteResponse.body.data.active).toBe('Inactive');

    // ===== TEST 9: RESPONSE STRUCTURE VALIDATION =====
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

    // Delete the menu
    const structureResponse = await supertest(web)
      .delete(`${baseUrlTest}/${structureMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('key_menu');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('active');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    // ===== TEST 10: MULTIPLE DELETE REQUESTS FOR SAME MENU =====
    console.log('🧪 Testing multiple delete requests for same menu...');
    
    // Create a test menu for multiple delete requests
    const multipleMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'multiple-menu',
        name: 'Multiple Menu'
      });

    expect(multipleMenuResponse.status).toBe(200);
    const multipleMenuId = multipleMenuResponse.body.data.id;

    // Delete the menu multiple times
    const response1 = await supertest(web)
      .delete(`${baseUrlTest}/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    const response2 = await supertest(web)
      .delete(`${baseUrlTest}/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    const response3 = await supertest(web)
      .delete(`${baseUrlTest}/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(response1.status).toBe(200);
    expect(response2.status).toBe(200);
    expect(response3.status).toBe(200);
    expect(response1.body.data.active).toBe('Inactive');
    expect(response2.body.data.active).toBe('Inactive');
    expect(response3.body.data.active).toBe('Inactive');

    // ===== TEST 11: CONCURRENT DELETE REQUESTS =====
    console.log('🧪 Testing concurrent delete requests...');
    
    // Create multiple menus for concurrent deletion
    const concurrentMenuPromises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: `concurrent-menu-${index + 1}`,
          name: `Concurrent Menu ${index + 1}`
        })
    );

    const concurrentCreateResponses = await Promise.all(concurrentMenuPromises);
    const menuIds = concurrentCreateResponses.map(response => response.body.data.id);

    // Delete all menus concurrently
    const concurrentDeletePromises = menuIds.map(menuId =>
      supertest(web)
        .delete(`${baseUrlTest}/${menuId}`)
        .set('Cookie', cookieHeader ?? '')
    );

    const concurrentDeleteResponses = await Promise.all(concurrentDeletePromises);

    concurrentDeleteResponses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Inactive');
    });

    console.log('✅ All delete menu flow tests completed successfully');
  });
});
