import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Active Business Flow', () => {
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

  it('Should handle complete active menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU ACTIVATION =====
    console.log('🧪 Testing successful menu activation...');
    
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

    // Deactivate the menu first
    const deactivateResponse = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateResponse.status).toBe(200);
    expect(deactivateResponse.body.data.active).toBe('Inactive');

    // Activate the menu
    const activateResponse = await supertest(web)
      .put(`${baseUrlTest}/active/${menuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(activateResponse.status).toBe(200);
    expect(activateResponse.body.data.active).toBe('Active');
    expect(activateResponse.body.data.id).toBe(menuId);

    // ===== TEST 2: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing non-existent menu ID...');
    
    const nonExistentResponse = await supertest(web)
      .put(`${baseUrlTest}/active/999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toBeDefined();

    // ===== TEST 3: NEGATIVE MENU ID =====
    console.log('🧪 Testing negative menu ID...');
    
    const negativeIdResponse = await supertest(web)
      .put(`${baseUrlTest}/active/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeIdResponse.status).toBe(404);
    expect(negativeIdResponse.body.errors).toBeDefined();

    // ===== TEST 4: ZERO MENU ID =====
    console.log('🧪 Testing zero menu ID...');
    
    const zeroIdResponse = await supertest(web)
      .put(`${baseUrlTest}/active/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroIdResponse.status).toBe(404);
    expect(zeroIdResponse.body.errors).toBeDefined();

    // ===== TEST 5: VERY LARGE MENU ID =====
    console.log('🧪 Testing very large menu ID...');
    
    const largeIdResponse = await supertest(web)
      .put(`${baseUrlTest}/active/999999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeIdResponse.status).toBe(500);
    expect(largeIdResponse.body.errors).toBeDefined();

    // ===== TEST 6: INVALID MENU ID FORMAT =====
    console.log('🧪 Testing invalid menu ID format...');
    
    const invalidIdResponse = await supertest(web)
      .put(`${baseUrlTest}/active/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidIdResponse.status).toBe(500);
    expect(invalidIdResponse.body.errors).toBeDefined();

    // ===== TEST 7: ACTIVATE ALREADY ACTIVE MENU =====
    console.log('🧪 Testing activate already active menu...');
    
    // Create another menu
    const activeMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'active-menu',
        name: 'Active Menu'
      });

    expect(activeMenuResponse.status).toBe(200);
    const activeMenuId = activeMenuResponse.body.data.id;

    // Try to activate already active menu
    const alreadyActiveResponse = await supertest(web)
      .put(`${baseUrlTest}/active/${activeMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(alreadyActiveResponse.status).toBe(200);
    expect(alreadyActiveResponse.body.data.active).toBe('Active');

    // ===== TEST 8: ACTIVATE MENU WITH SUBMENUS =====
    console.log('🧪 Testing activate menu with submenus...');
    
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
    const submenuId = submenuResponse.body.data.id;

    // Deactivate parent menu
    const deactivateParentResponse = await supertest(web)
      .delete(`${baseUrlTest}/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateParentResponse.status).toBe(200);
    expect(deactivateParentResponse.body.data.active).toBe('Inactive');

    // Activate parent menu
    const activateParentResponse = await supertest(web)
      .put(`${baseUrlTest}/active/${parentId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(activateParentResponse.status).toBe(200);
    expect(activateParentResponse.body.data.active).toBe('Active');

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

    // Deactivate the menu
    const deactivateStructureResponse = await supertest(web)
      .delete(`${baseUrlTest}/${structureMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateStructureResponse.status).toBe(200);

    // Activate the menu
    const activateStructureResponse = await supertest(web)
      .put(`${baseUrlTest}/active/${structureMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(activateStructureResponse.status).toBe(200);
    expect(activateStructureResponse.body).toHaveProperty('data');
    expect(activateStructureResponse.body.data).toHaveProperty('id');
    expect(activateStructureResponse.body.data).toHaveProperty('key_menu');
    expect(activateStructureResponse.body.data).toHaveProperty('name');
    expect(activateStructureResponse.body.data).toHaveProperty('active');
    expect(activateStructureResponse.body.data).toHaveProperty('created_by');
    expect(activateStructureResponse.body.data).toHaveProperty('created_at');
    expect(activateStructureResponse.body.data).toHaveProperty('updated_by');
    expect(activateStructureResponse.body.data).toHaveProperty('updated_at');

    // ===== TEST 10: MULTIPLE ACTIVATION REQUESTS =====
    console.log('🧪 Testing multiple activation requests...');
    
    // Create a test menu for multiple activation requests
    const multipleMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'multiple-menu',
        name: 'Multiple Menu'
      });

    expect(multipleMenuResponse.status).toBe(200);
    const multipleMenuId = multipleMenuResponse.body.data.id;

    // Deactivate the menu
    const deactivateMultipleResponse = await supertest(web)
      .delete(`${baseUrlTest}/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(deactivateMultipleResponse.status).toBe(200);

    // Activate the menu multiple times
    const activate1Response = await supertest(web)
      .put(`${baseUrlTest}/active/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    const activate2Response = await supertest(web)
      .put(`${baseUrlTest}/active/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    const activate3Response = await supertest(web)
      .put(`${baseUrlTest}/active/${multipleMenuId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(activate1Response.status).toBe(200);
    expect(activate2Response.status).toBe(200);
    expect(activate3Response.status).toBe(200);
    expect(activate1Response.body.data.active).toBe('Active');
    expect(activate2Response.body.data.active).toBe('Active');
    expect(activate3Response.body.data.active).toBe('Active');

    // ===== TEST 11: CONCURRENT ACTIVATION REQUESTS =====
    console.log('🧪 Testing concurrent activation requests...');
    
    // Create multiple menus for concurrent activation
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

    // Deactivate all menus
    const deactivatePromises = menuIds.map(menuId =>
      supertest(web)
        .delete(`${baseUrlTest}/${menuId}`)
        .set('Cookie', cookieHeader ?? '')
    );

    await Promise.all(deactivatePromises);

    // Activate all menus concurrently
    const activatePromises = menuIds.map(menuId =>
      supertest(web)
        .put(`${baseUrlTest}/active/${menuId}`)
        .set('Cookie', cookieHeader ?? '')
    );

    const concurrentActivateResponses = await Promise.all(activatePromises);

    concurrentActivateResponses.forEach(response => {
      expect(response.status).toBe(200);
      expect(response.body.data.active).toBe('Active');
    });

    console.log('✅ All active menu flow tests completed successfully');
  });
});
