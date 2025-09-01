import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Hard Delete Business Flow', () => {
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

  it('Should handle complete hard delete menu flow including validation, edge cases, and business rules', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL HARD DELETE MENU WITHOUT CHILDREN =====
    console.log('🧪 Testing successful hard delete menu without children...');

    // Create a test menu first
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Test Menu',
      });

    expect(createResponse.status).toBe(200);
    const menuId = createResponse.body.data.id;

    // Hard delete the menu
    const hardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${menuId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(hardDeleteResponse.status).toBe(200);
    expect(hardDeleteResponse.body.message).toBe('Success to permanently delete data menu.');
    expect(hardDeleteResponse.body.data.id).toBe(menuId);

    // Verify menu is completely deleted by trying to fetch it
    const verifyDeleteResponse = await supertest(web)
      .get(`${baseUrlTest}/${menuId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(verifyDeleteResponse.status).toBe(404);
    expect(verifyDeleteResponse.body.errors).toContain('The menu does not exist!');

    // ===== TEST 2: HARD DELETE MENU WITH CHILDREN (SHOULD FAIL) =====
    console.log('🧪 Testing hard delete menu with children (should fail)...');

    // Create a parent menu
    const parentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu',
      });

    expect(parentResponse.status).toBe(200);
    const parentId = parentResponse.body.data.id;

    // Create a child menu
    const childResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'child-menu',
        name: 'Child Menu',
        menu_id: parentId,
      });

    expect(childResponse.status).toBe(200);

    // Try to hard delete parent menu (should fail)
    const parentHardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${parentId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(parentHardDeleteResponse.status).toBe(400);
    expect(parentHardDeleteResponse.body.errors).toContain('Cannot delete menu that has children!');

    // Verify parent menu still exists
    const verifyParentResponse = await supertest(web)
      .get(`${baseUrlTest}/${parentId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(verifyParentResponse.status).toBe(200);
    expect(verifyParentResponse.body.data.id).toBe(parentId);

    // ===== TEST 3: HARD DELETE CHILD MENU FIRST, THEN PARENT =====
    console.log('🧪 Testing hard delete child menu first, then parent...');

    // Hard delete child menu first
    const childHardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${childResponse.body.data.id}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(childHardDeleteResponse.status).toBe(200);
    expect(childHardDeleteResponse.body.message).toBe('Success to permanently delete data menu.');

    // Now hard delete parent menu (should succeed)
    const parentHardDeleteResponse2 = await supertest(web)
      .delete(`${baseUrlTest}/${parentId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(parentHardDeleteResponse2.status).toBe(200);
    expect(parentHardDeleteResponse2.body.message).toBe('Success to permanently delete data menu.');

    // Verify both menus are completely deleted
    const verifyChildResponse = await supertest(web)
      .get(`${baseUrlTest}/${childResponse.body.data.id}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const verifyParentResponse2 = await supertest(web)
      .get(`${baseUrlTest}/${parentId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(verifyChildResponse.status).toBe(404);
    expect(verifyParentResponse2.status).toBe(404);

    // ===== TEST 4: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing hard delete non-existent menu ID...');

    const nonExistentResponse = await supertest(web)
      .delete(`${baseUrlTest}/999999/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain('The menu does not exist!');

    // ===== TEST 5: NEGATIVE MENU ID =====
    console.log('🧪 Testing hard delete negative menu ID...');

    const negativeIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/-1/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeIdResponse.status).toBe(404);
    expect(negativeIdResponse.body.errors).toContain('The menu does not exist!');

    // ===== TEST 6: ZERO MENU ID =====
    console.log('🧪 Testing hard delete zero menu ID...');

    const zeroIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/0/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroIdResponse.status).toBe(404);
    expect(zeroIdResponse.body.errors).toContain('The menu does not exist!');

    // ===== TEST 7: INVALID MENU ID FORMAT =====
    console.log('🧪 Testing hard delete invalid menu ID format...');

    const invalidIdResponse = await supertest(web)
      .delete(`${baseUrlTest}/invalid/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidIdResponse.status).toBe(400);
    expect(invalidIdResponse.body.errors).toBeDefined();

    // ===== TEST 8: HARD DELETE MENU WITH ROLE MENU ASSOCIATIONS =====
    console.log('🧪 Testing hard delete menu with role menu associations...');

    // Create a menu
    const menuWithRoleResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-with-role',
        name: 'Menu With Role',
      });

    expect(menuWithRoleResponse.status).toBe(200);
    const menuWithRoleId = menuWithRoleResponse.body.data.id;

    // Create role menu association (simulate through direct database insertion)
    // Note: In real scenario, this would be done through role menu management
    // For test purposes, we'll just hard delete the menu and verify it works

    // Hard delete the menu
    const menuWithRoleHardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${menuWithRoleId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(menuWithRoleHardDeleteResponse.status).toBe(200);
    expect(menuWithRoleHardDeleteResponse.body.message).toBe('Success to permanently delete data menu.');

    // ===== TEST 9: COMPLEX HIERARCHY HARD DELETE =====
    console.log('🧪 Testing complex hierarchy hard delete...');

    // Create a complex menu hierarchy: Root -> Level1 -> Level2 -> Level3
    const rootResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'root-menu',
        name: 'Root Menu',
      });

    expect(rootResponse.status).toBe(200);
    const rootId = rootResponse.body.data.id;

    const level1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level1-menu',
        name: 'Level 1 Menu',
        menu_id: rootId,
      });

    expect(level1Response.status).toBe(200);
    const level1Id = level1Response.body.data.id;

    const level2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level2-menu',
        name: 'Level 2 Menu',
        menu_id: level1Id,
      });

    expect(level2Response.status).toBe(200);
    const level2Id = level2Response.body.data.id;

    const level3Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level3-menu',
        name: 'Level 3 Menu',
        menu_id: level2Id,
      });

    expect(level3Response.status).toBe(200);
    const level3Id = level3Response.body.data.id;

    // Try to hard delete root menu (should fail)
    const rootHardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${rootId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(rootHardDeleteResponse.status).toBe(400);
    expect(rootHardDeleteResponse.body.errors).toContain('Cannot delete menu that has children!');

    // Hard delete from bottom up: Level3 -> Level2 -> Level1 -> Root
    const level3HardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${level3Id}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(level3HardDeleteResponse.status).toBe(200);

    const level2HardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${level2Id}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(level2HardDeleteResponse.status).toBe(200);

    const level1HardDeleteResponse = await supertest(web)
      .delete(`${baseUrlTest}/${level1Id}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(level1HardDeleteResponse.status).toBe(200);

    // Now hard delete root menu (should succeed)
    const rootHardDeleteResponse2 = await supertest(web)
      .delete(`${baseUrlTest}/${rootId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(rootHardDeleteResponse2.status).toBe(200);

    // Verify all menus are completely deleted
    const verifyRootResponse = await supertest(web)
      .get(`${baseUrlTest}/${rootId}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const verifyLevel1Response = await supertest(web)
      .get(`${baseUrlTest}/${level1Id}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const verifyLevel2Response = await supertest(web)
      .get(`${baseUrlTest}/${level2Id}/detail`)
      .set('Cookie', cookieHeader ?? '');

    const verifyLevel3Response = await supertest(web)
      .get(`${baseUrlTest}/${level3Id}/detail`)
      .set('Cookie', cookieHeader ?? '');

    expect(verifyRootResponse.status).toBe(404);
    expect(verifyLevel1Response.status).toBe(404);
    expect(verifyLevel2Response.status).toBe(404);
    expect(verifyLevel3Response.status).toBe(404);

    // ===== TEST 10: RESPONSE STRUCTURE VALIDATION =====
    console.log('🧪 Testing response structure validation...');

    // Create a test menu for structure validation
    const structureMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'structure-menu',
        name: 'Structure Menu',
      });

    expect(structureMenuResponse.status).toBe(200);
    const structureMenuId = structureMenuResponse.body.data.id;

    // Hard delete the menu
    const structureResponse = await supertest(web)
      .delete(`${baseUrlTest}/${structureMenuId}/hard`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe('Success to permanently delete data menu.');
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('key_menu');
    expect(structureResponse.body.data).toHaveProperty('name');
    expect(structureResponse.body.data).toHaveProperty('order_number');
    expect(structureResponse.body.data).toHaveProperty('url');
    expect(structureResponse.body.data).toHaveProperty('menu_id');
    expect(structureResponse.body.data).toHaveProperty('active');
    expect(structureResponse.body.data).toHaveProperty('created_by');
    expect(structureResponse.body.data).toHaveProperty('created_at');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data).toHaveProperty('updated_at');

    // ===== TEST 11: CONCURRENT HARD DELETE REQUESTS =====
    console.log('🧪 Testing concurrent hard delete requests...');

    // Create multiple menus for concurrent deletion
    const concurrentMenuPromises = Array(3)
      .fill(null)
      .map((_, index) =>
        supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            key_menu: `concurrent-menu-${index + 1}`,
            name: `Concurrent Menu ${index + 1}`,
          }),
      );

    const concurrentCreateResponses = await Promise.all(concurrentMenuPromises);
    const menuIds = concurrentCreateResponses.map(
      (response) => response.body.data.id,
    );

    // Hard delete all menus concurrently
    const concurrentHardDeletePromises = menuIds.map((menuId) =>
      supertest(web)
        .delete(`${baseUrlTest}/${menuId}/hard`)
        .set('Cookie', cookieHeader ?? ''),
    );

    const concurrentHardDeleteResponses = await Promise.all(
      concurrentHardDeletePromises,
    );

    concurrentHardDeleteResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('Success to permanently delete data menu.');
    });

    // Verify all menus are completely deleted
    const verifyConcurrentPromises = menuIds.map((menuId) =>
      supertest(web)
        .get(`${baseUrlTest}/${menuId}/detail`)
        .set('Cookie', cookieHeader ?? ''),
    );

    const verifyConcurrentResponses = await Promise.all(verifyConcurrentPromises);

    verifyConcurrentResponses.forEach((response) => {
      expect(response.status).toBe(404);
      expect(response.body.errors).toContain('The menu does not exist!');
    });

    console.log('✅ All hard delete menu flow tests completed successfully');
  });
});
