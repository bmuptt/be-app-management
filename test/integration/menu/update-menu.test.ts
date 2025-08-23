import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/menu';

describe('Menu Update Business Flow', () => {
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

  it('Should handle complete update menu flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL MENU UPDATE =====
    console.log('🧪 Testing successful menu update...');
    
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

    // Update the menu
    const updateData = {
      key_menu: 'updated-menu',
      name: 'Updated Menu'
    };

    const updateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    expect(updateResponse.status).toBe(200);
    expect(updateResponse.body.data).toBeDefined();
    expect(updateResponse.body.data.id).toBe(menuId);
    expect(updateResponse.body.data.key_menu).toBe('updated-menu');
    expect(updateResponse.body.data.name).toBe('Updated Menu');
    expect(updateResponse.body.data.menu_id).toBe(null);
    expect(updateResponse.body.data.active).toBe('Active');

    // ===== TEST 2: NON-EXISTENT MENU ID =====
    console.log('🧪 Testing non-existent menu ID...');
    
    const nonExistentResponse = await supertest(web)
      .patch(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '')
      .send(updateData);

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toBeDefined();

    // ===== TEST 3: DUPLICATE KEY_MENU =====
    console.log('🧪 Testing duplicate key_menu...');
    
    // Create first menu
    const menu1Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-1',
        name: 'Menu 1'
      });

    expect(menu1Response.status).toBe(200);
    const menuId1 = menu1Response.body.data.id;

    // Create second menu
    const menu2Response = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-2',
        name: 'Menu 2'
      });

    expect(menu2Response.status).toBe(200);
    const menuId2 = menu2Response.body.data.id;

    // Try to update second menu with first menu's key_menu
    const duplicateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'menu-1',
        name: 'Updated Menu 2'
      });

    expect(duplicateResponse.status).toBe(400);
    expect(duplicateResponse.body.errors).toContain('The key menu cannot be the same!');

    // ===== TEST 4: VALIDATION ERRORS FOR MISSING REQUIRED FIELDS =====
    console.log('🧪 Testing validation errors for missing required fields...');
    
    const validationTestCases = [
      { 
        data: {}, 
        expectedErrors: ['The key menu is required!', 'The name is required!'] 
      },
      { 
        data: { key_menu: 'test' }, 
        expectedErrors: ['The name is required!'] 
      },
      { 
        data: { name: 'Test Menu' }, 
        expectedErrors: ['The key menu is required!'] 
      },
    ];

    for (const testCase of validationTestCases) {
      const validationResponse = await supertest(web)
        .patch(`${baseUrlTest}/${menuId1}`)
        .set('Cookie', cookieHeader ?? '')
        .send(testCase.data);

      expect(validationResponse.status).toBe(400);
      expect(validationResponse.body.errors).toEqual(expect.arrayContaining(testCase.expectedErrors));
    }

    // ===== TEST 5: VALIDATION ERRORS FOR EMPTY FIELDS =====
    console.log('🧪 Testing validation errors for empty fields...');
    
    const emptyKeyMenuResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId1}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: '',
        name: 'Test Menu'
      });

    expect(emptyKeyMenuResponse.status).toBe(400);
    expect(emptyKeyMenuResponse.body.errors).toContain('The key menu is required!');

    const emptyNameResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId1}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'test-menu-3',
        name: ''
      });

    expect(emptyNameResponse.status).toBe(400);
    expect(emptyNameResponse.body.errors).toContain('The name is required!');

    // ===== TEST 6: UPDATE WITH OPTIONAL FIELDS =====
    console.log('🧪 Testing update with optional fields...');
    
    const optionalFieldsData = {
      key_menu: 'optional-menu',
      name: 'Optional Menu',
      url: '/optional-menu',
      order_number: 5,
      active: 'Inactive'
    };

    const optionalFieldsResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId1}`)
      .set('Cookie', cookieHeader ?? '')
      .send(optionalFieldsData);

    expect(optionalFieldsResponse.status).toBe(200);
    expect(optionalFieldsResponse.body.data.key_menu).toBe(optionalFieldsData.key_menu);
    expect(optionalFieldsResponse.body.data.name).toBe(optionalFieldsData.name);
    expect(optionalFieldsResponse.body.data.url).toBe(optionalFieldsData.url);
    // Note: order_number and active are not updated in this API, they remain unchanged
    expect(optionalFieldsResponse.body.data.order_number).toBe(3); // Original value
    expect(optionalFieldsResponse.body.data.active).toBe('Active'); // Original value

    // ===== TEST 7: UPDATE PARENT MENU =====
    console.log('🧪 Testing update parent menu...');
    
    // Create a new menu for parent update test
    const parentMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'parent-menu',
        name: 'Parent Menu'
      });

    expect(parentMenuResponse.status).toBe(200);
    const parentMenuId = parentMenuResponse.body.data.id;

    // Create another menu to be updated as submenu
    const submenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu'
      });

    expect(submenuResponse.status).toBe(200);
    const submenuId = submenuResponse.body.data.id;

    // Update submenu to have parent
    const parentUpdateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${submenuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: parentMenuId
      });

    expect(parentUpdateResponse.status).toBe(200);
    // Note: menu_id is not updated in this API, it remains null
    expect(parentUpdateResponse.body.data.menu_id).toBe(null);

    // ===== TEST 8: INVALID PARENT MENU ID =====
    console.log('🧪 Testing invalid parent menu ID...');
    
    const invalidParentResponse = await supertest(web)
      .patch(`${baseUrlTest}/${submenuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'submenu',
        name: 'Submenu',
        menu_id: 999999
      });

    // Note: menu_id is not validated or updated in the update endpoint
    // The API ignores the menu_id field and returns 200
    expect(invalidParentResponse.status).toBe(200);
    expect(invalidParentResponse.body.data.key_menu).toBe('submenu');
    expect(invalidParentResponse.body.data.name).toBe('Submenu');
    // menu_id remains unchanged since it's not updated by this endpoint
    expect(invalidParentResponse.body.data.menu_id).toBe(null);

    // ===== TEST 9: SPECIAL CHARACTERS IN FIELDS =====
    console.log('🧪 Testing special characters in fields...');
    
    const specialCharData = {
      key_menu: 'special-menu-123',
      name: 'Special Menu & More',
      url: '/special/menu?param=value'
    };

    const specialCharResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send(specialCharData);

    expect(specialCharResponse.status).toBe(200);
    expect(specialCharResponse.body.data.key_menu).toBe(specialCharData.key_menu);
    expect(specialCharResponse.body.data.name).toBe(specialCharData.name);
    expect(specialCharResponse.body.data.url).toBe(specialCharData.url);

    // ===== TEST 10: UPDATE WITH EXTRA FIELDS =====
    console.log('🧪 Testing update with extra fields...');
    
    const extraFieldsData = {
      key_menu: 'extra-menu',
      name: 'Extra Menu',
      extra_field: 'should be ignored',
      another_field: 123,
      nested_field: { key: 'value' }
    };

    const extraFieldsResponse = await supertest(web)
      .patch(`${baseUrlTest}/${menuId2}`)
      .set('Cookie', cookieHeader ?? '')
      .send(extraFieldsData);

    expect(extraFieldsResponse.status).toBe(200);
    expect(extraFieldsResponse.body.data.key_menu).toBe(extraFieldsData.key_menu);
    expect(extraFieldsResponse.body.data.name).toBe(extraFieldsData.name);
    expect(extraFieldsResponse.body.data.extra_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.another_field).toBeUndefined();
    expect(extraFieldsResponse.body.data.nested_field).toBeUndefined();

    // ===== TEST 11: PARTIAL UPDATE =====
    console.log('🧪 Testing partial update...');
    
    // Create a menu for partial update
    const partialMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'partial-menu',
        name: 'Partial Menu'
      });

    expect(partialMenuResponse.status).toBe(200);
    const partialMenuId = partialMenuResponse.body.data.id;

    // Update only name
    const partialUpdateResponse = await supertest(web)
      .patch(`${baseUrlTest}/${partialMenuId}`)
      .set('Cookie', cookieHeader ?? '')
      .send({
        name: 'Updated Partial Menu'
      });

    expect(partialUpdateResponse.status).toBe(400);
    expect(partialUpdateResponse.body.errors).toContain('The key menu is required!');

    // ===== TEST 12: CONCURRENT UPDATES =====
    console.log('🧪 Testing concurrent updates...');
    
    // Create a menu for concurrent updates
    const concurrentMenuResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        key_menu: 'concurrent-menu',
        name: 'Concurrent Menu'
      });

    expect(concurrentMenuResponse.status).toBe(200);
    const concurrentMenuId = concurrentMenuResponse.body.data.id;

    // Make concurrent update requests
    const concurrentPromises = Array(3).fill(null).map((_, index) =>
      supertest(web)
        .patch(`${baseUrlTest}/${concurrentMenuId}`)
        .set('Cookie', cookieHeader ?? '')
        .send({
          key_menu: `concurrent-menu-${index + 1}`,
          name: `Concurrent Menu ${index + 1}`
        })
    );

    const concurrentResponses = await Promise.all(concurrentPromises);

    // At least one should succeed
    const successfulUpdates = concurrentResponses.filter(response => response.status === 200);
    expect(successfulUpdates.length).toBeGreaterThan(0);

    console.log('✅ All update menu flow tests completed successfully');
  });
});
