import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Store Menu Business Flow', () => {
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

  it('Should handle complete store menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU CREATION =====
    console.log('🧪 Testing successful menu creation...');

    const menuData = {
      key_menu: 'test-menu',
      name: 'Test Menu',
      url: '/test-menu',
    };

    const response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(menuData);

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to add data menu.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.key_menu).toBe(menuData.key_menu);
    expect(response.body.data.name).toBe(menuData.name);
    expect(response.body.data.url).toBe(menuData.url);
    expect(response.body.data.active).toBe('Active');
    expect(response.body.data.created_by).toBe(1);
    expect(response.body.data.order_number).toBe(2);
    expect(response.body.data.menu_id).toBeNull();

    // ===== TEST 2: SUCCESSFUL SUBMENU CREATION =====
    console.log('🧪 Testing successful submenu creation...');

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

    // Create submenu
    const submenuData = {
      key_menu: 'sub-menu',
      name: 'Sub Menu',
      url: '/parent/sub-menu',
      menu_id: parentId,
    };

    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(submenuData);

    expect(submenuResponse.status).toBe(200);
    expect(submenuResponse.body.data.key_menu).toBe(submenuData.key_menu);
    expect(submenuResponse.body.data.name).toBe(submenuData.name);
    expect(submenuResponse.body.data.url).toBe(submenuData.url);
    expect(submenuResponse.body.data.menu_id).toBe(parentId);
    expect(submenuResponse.body.data.order_number).toBe(1);

    // ===== TEST 3: DUPLICATE KEY_MENU ERROR =====
    console.log('🧪 Testing duplicate key_menu error...');

    const duplicateResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu',
        name: 'Duplicate Menu',
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain(
      'The key menu cannot be the same!',
    );

    // ===== TEST 4: VALIDATION ERRORS FOR MISSING REQUIRED FIELDS =====
    console.log('🧪 Testing validation errors for missing required fields...');

    const testCases = [
      {
        data: {},
        expectedErrors: ['The key menu is required!', 'The name is required!'],
      },
      {
        data: { key_menu: 'test' },
        expectedErrors: ['The name is required!'],
      },
      {
        data: { name: 'Test Menu' },
        expectedErrors: ['The key menu is required!'],
      },
    ];

    for (const testCase of testCases) {
      const validationResponse = await supertest(web)
        .post(baseUrlTest)
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      expect(validationResponse.status).toBe(400);
      expect(validationResponse.body.errors).toEqual(
        expect.arrayContaining(testCase.expectedErrors),
      );
    }

    // ===== TEST 5: VALIDATION ERRORS FOR EMPTY FIELDS =====
    console.log('🧪 Testing validation errors for empty fields...');

    const emptyKeyMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: '',
        name: 'Test Menu',
      });

    expect(emptyKeyMenuResponse.status).toBe(400);
    expect(emptyKeyMenuResponse.body.errors).toContain(
      'The key menu is required!',
    );

    const emptyNameResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-2',
        name: '',
      });

    expect(emptyNameResponse.status).toBe(400);
    expect(emptyNameResponse.body.errors).toContain('The name is required!');

    // ===== TEST 6: INVALID PARENT MENU ID =====
    console.log('🧪 Testing invalid parent menu ID...');

    const invalidParentResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'invalid-parent-menu',
        name: 'Invalid Parent Menu',
        menu_id: 999999,
      });

    expect(invalidParentResponse.status).toBe(404);
    expect(invalidParentResponse.body.errors).toContain(
      'The parent menu is not found!',
    );

    // ===== TEST 7: MENU CREATION WITH OPTIONAL FIELDS =====
    console.log('🧪 Testing menu creation with optional fields...');

    const optionalFieldsData = {
      key_menu: 'optional-menu',
      name: 'Optional Menu',
      url: '/optional-menu',
      order_number: 5,
      active: 'Inactive',
    };

    const optionalFieldsResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(optionalFieldsData);

    expect(optionalFieldsResponse.status).toBe(200);
    expect(optionalFieldsResponse.body.data.key_menu).toBe(
      optionalFieldsData.key_menu,
    );
    expect(optionalFieldsResponse.body.data.name).toBe(optionalFieldsData.name);
    expect(optionalFieldsResponse.body.data.url).toBe(optionalFieldsData.url);
    // Note: order_number is auto-generated by the API, not from the request
    expect(optionalFieldsResponse.body.data.order_number).toBe(4);
    // Note: active is hardcoded to 'Active' in the API, not from the request
    expect(optionalFieldsResponse.body.data.active).toBe('Active');

    // ===== TEST 8: SPECIAL CHARACTERS IN FIELDS =====
    console.log('🧪 Testing special characters in fields...');

    const specialCharData = {
      key_menu: 'special-menu-123',
      name: 'Special Menu & More',
      url: '/special/menu?param=value',
    };

    const specialCharResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(specialCharData);

    expect(specialCharResponse.status).toBe(200);
    expect(specialCharResponse.body.data.key_menu).toBe(
      specialCharData.key_menu,
    );
    expect(specialCharResponse.body.data.name).toBe(specialCharData.name);
    expect(specialCharResponse.body.data.url).toBe(specialCharData.url);

    // ===== TEST 9: CONCURRENT MENU CREATION =====
    console.log('🧪 Testing concurrent menu creation...');

    const concurrentPromises = Array(3)
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

    const concurrentResponses = await Promise.all(concurrentPromises);

    concurrentResponses.forEach((response, index) => {
      expect(response.status).toBe(200);
      expect(response.body.data.key_menu).toBe(`concurrent-menu-${index + 1}`);
      expect(response.body.data.name).toBe(`Concurrent Menu ${index + 1}`);
    });

    // ===== TEST 10: MENU CREATION WITH EXTRA FIELDS =====
    console.log('🧪 Testing menu creation with extra fields...');

    const extraFieldsData = {
      key_menu: 'extra-menu',
      name: 'Extra Menu',
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' },
    };

    const extraFieldsResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.key_menu).toBe(
      extraFieldsData.key_menu,
    );
    expect(extraFieldsResponse.body.data.name).toBe(extraFieldsData.name);
    expect(extraFieldsResponse.body.data.extra_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.another_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.nested_field).toBeUndefined();

    // ===== TEST 11: DEEP NESTED MENU STRUCTURE =====
    console.log('🧪 Testing deep nested menu structure...');

    // Create level 1 menu
    const level1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level1',
        name: 'Level 1 Menu',
      });

    expect(level1Response.status).toBe(200);
    const level1Id = level1Response.body.data.id;

    // Create level 2 menu
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

    // Create level 3 menu
    const level3Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'level3',
        name: 'Level 3 Menu',
        menu_id: level2Id,
      });

    expect(level3Response.status).toBe(200);
    expect(level3Response.body.data.menu_id).toBe(level2Id);

    console.log('✅ All store menu flow tests completed successfully');
  });
});
