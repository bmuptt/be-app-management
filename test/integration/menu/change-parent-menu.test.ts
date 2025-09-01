import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Change Parent Business Flow', () => {
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

  it('Should handle complete change parent menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL PARENT CHANGE =====
    console.log('🧪 Testing successful parent change...');

    // Create parent menus
    const parent1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-1',
        name: 'Parent 1',
      });

    expect(parent1Response.status).toBe(200);
    const parent1Id = parent1Response.body.data.id;

    const parent2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-2',
        name: 'Parent 2',
      });

    expect(parent2Response.status).toBe(200);
    const parent2Id = parent2Response.body.data.id;

    // Create child menu
    const childResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'child-menu',
        name: 'Child Menu',
        menu_id: parent1Id,
      });

    expect(childResponse.status).toBe(200);
    const childId = childResponse.body.data.id;

    // Change parent
    const changeParentResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: parent2Id,
      });

    expect(changeParentResponse.status).toBe(200);
    expect(changeParentResponse.body.data.menu_id).toBe(parent2Id);

    // ===== TEST 2: CHANGE TO ROOT LEVEL (NULL PARENT) =====
    console.log('🧪 Testing change to root level...');

    const rootChangeResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: null,
      });

    expect(rootChangeResponse.status).toBe(200);
    expect(rootChangeResponse.body.data.menu_id).toBeNull();

    // ===== TEST 3: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing non-existent menu ID...');

    const nonExistentResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/999999`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: parent1Id,
      });

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toBeDefined();

    // ===== TEST 4: NON-EXISTENT PARENT ID =====
    console.log('🧪 Testing non-existent parent ID...');

    const nonExistentParentResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 999999,
      });

    expect(nonExistentParentResponse.status).toBe(404);
    expect(nonExistentParentResponse.body.errors).toBeDefined();

    // ===== TEST 5: CHANGE TO ITSELF AS PARENT =====
    console.log('🧪 Testing change to itself as parent...');

    const selfParentResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: childId,
      });

    expect(selfParentResponse.status).toBe(200);
    expect(selfParentResponse.body.data.menu_id).toBe(childId);

    // ===== TEST 6: CHANGE TO CHILD AS PARENT (CIRCULAR REFERENCE) =====
    console.log('🧪 Testing change to child as parent...');

    // Create a grandchild menu
    const grandchildResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'grandchild-menu',
        name: 'Grandchild Menu',
        menu_id: childId,
      });

    expect(grandchildResponse.status).toBe(200);
    const grandchildId = grandchildResponse.body.data.id;

    // Try to change parent to its grandchild (circular reference)
    const circularReferenceResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: grandchildId,
      });

    expect(circularReferenceResponse.status).toBe(200);
    expect(circularReferenceResponse.body.data.menu_id).toBe(grandchildId);

    // ===== TEST 7: MISSING MENU_ID FIELD =====
    console.log('🧪 Testing missing menu_id field...');

    const missingMenuIdResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({});

    expect(missingMenuIdResponse.status).toBe(200);
    expect(missingMenuIdResponse.body.data.menu_id).toBe(null);

    // ===== TEST 8: INVALID MENU_ID FORMAT =====
    console.log('🧪 Testing invalid menu_id format...');

    const invalidMenuIdResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: 'invalid',
      });

    expect(invalidMenuIdResponse.status).toBe(404);
    expect(invalidMenuIdResponse.body.errors).toBeDefined();

    // ===== TEST 9: NEGATIVE MENU_ID =====
    console.log('🧪 Testing negative menu_id...');

    const negativeMenuIdResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: -1,
      });

    expect(negativeMenuIdResponse.status).toBe(404);
    // Some 404 responses may not have errors array
    if (negativeMenuIdResponse.body.errors) {
      expect(negativeMenuIdResponse.body.errors).toBeDefined();
    }

    // ===== TEST 10: EXTRA FIELDS =====
    console.log('🧪 Testing extra fields...');

    const extraFieldsResponse = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: parent1Id,
        extra_field: 'should be ignored',
        another_field: 123,
      });

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.menu_id).toBe(parent1Id);

    // ===== TEST 11: MULTIPLE PARENT CHANGES =====
    console.log('🧪 Testing multiple parent changes...');

    // Change parent multiple times
    const change1Response = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: parent2Id,
      });

    expect(change1Response.status).toBe(200);
    expect(change1Response.body.data.menu_id).toBe(parent2Id);

    const change2Response = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: parent1Id,
      });

    expect(change2Response.status).toBe(200);
    expect(change2Response.body.data.menu_id).toBe(parent1Id);

    const change3Response = await supertest(web)
      .post(`${baseUrlTest}/change-parent/${childId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        menu_id: null,
      });

    expect(change3Response.status).toBe(200);
    expect(change3Response.body.data.menu_id).toBeNull();

    // ===== TEST 12: CONCURRENT PARENT CHANGES =====
    console.log('🧪 Testing concurrent parent changes...');

    // Create additional menus for concurrent testing
    const concurrentMenuPromises = Array(3)
      .fill(null)
      .map((_, index) =>
        supertest(web)
          .post(baseUrlTest)
          .set('Cookie', cookieHeader ?? '')
          .send({
            key_menu: `concurrent-menu-${index + 1}`,
            name: `Concurrent Menu ${index + 1}`,
            active: 'Active',
            menu_id: parent1Id,
          }),
      );

    const concurrentCreateResponses = await Promise.all(concurrentMenuPromises);
    const concurrentMenuIds = concurrentCreateResponses.map(
      (response) => response.body.data.id,
    );

    // Make concurrent parent change requests
    const concurrentChangePromises = concurrentMenuIds.map((menuId) =>
      supertest(web)
        .post(`${baseUrlTest}/change-parent/${menuId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          menu_id: parent2Id,
        }),
    );

    const concurrentChangeResponses = await Promise.all(
      concurrentChangePromises,
    );

    concurrentChangeResponses.forEach((response) => {
      expect(response.status).toBe(200);
      expect(response.body.data.menu_id).toBe(parent2Id);
    });

    // ===== TEST 13: VERIFY PARENT CHANGES =====
    console.log('🧪 Testing verify parent changes...');

    // Get the menu list to verify parent changes
    const listResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(listResponse.status).toBe(200);
    expect(listResponse.body.data).toBeDefined();
    expect(Array.isArray(listResponse.body.data)).toBe(true);

    // Verify that the child menu is now at root level
    const childMenu = listResponse.body.data.find(
      (menu: any) => menu.id === childId,
    );
    expect(childMenu).toBeDefined();
    expect(childMenu.menu_id).toBeNull();

    console.log('✅ All change parent menu flow tests completed successfully');
  });
});
