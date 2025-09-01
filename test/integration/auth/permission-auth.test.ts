import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/permission';

describe('Permission Auth Business Flow', () => {
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

  it('Should handle complete permission flow including authentication, validation, and different menu permissions', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);
    // ===== TEST 1: AUTHENTICATION =====
    console.log('🧪 Testing permission authentication...');

    // Should return 401 when accessing permission without authentication
    const noAuthResponse = await supertest(web).get(baseUrlTest);
    expect(noAuthResponse.status).toBe(401);

    // ===== TEST 2: VALIDATION =====
    console.log('🧪 Testing permission validation...');

    // Should return 400 when key_menu parameter is missing
    const missingParamResponse = await supertest(web)
      .get(baseUrlTest)
      .set('Cookie', cookieHeader ?? '');
    expect(missingParamResponse.status).toBe(400);
    expect(missingParamResponse.body.errors).toEqual(
      expect.arrayContaining(['The key menu is required!']),
    );

    // Should return 400 when key_menu parameter is empty
    const emptyParamResponse = await supertest(web)
      .get(`${baseUrlTest}?key_menu=`)
      .set('Cookie', cookieHeader ?? '');
    expect(emptyParamResponse.status).toBe(400);
    expect(emptyParamResponse.body.errors).toEqual(
      expect.arrayContaining(['The key menu is required!']),
    );

    // ===== TEST 3: NONEXISTENT MENU =====
    console.log('🧪 Testing nonexistent menu permissions...');

    const nonexistentResponse = await supertest(web)
      .get(`${baseUrlTest}?key_menu=nonexistent_menu`)
      .set('Cookie', cookieHeader ?? '');
    expect(nonexistentResponse.status).toBe(200);
    expect(nonexistentResponse.body.data).toEqual({
      access: false,
      create: false,
      update: false,
      delete: false,
      approve1: false,
      approve2: false,
      approve3: false,
    });

    // ===== TEST 4: EXISTING MENU PERMISSIONS =====
    console.log('🧪 Testing existing menu permissions...');

    const userMenuResponse = await supertest(web)
      .get(`${baseUrlTest}?key_menu=user`)
      .set('Cookie', cookieHeader ?? '');
    expect(userMenuResponse.status).toBe(200);
    expect(userMenuResponse.body.data.access).toBe(true);
    expect(userMenuResponse.body.data.create).toBe(true);
    expect(userMenuResponse.body.message).toBe('Success to get permission.');

    // ===== TEST 5: MULTIPLE MENU KEYS =====
    console.log('🧪 Testing multiple menu keys...');

    const testCases = [
      { key_menu: 'user', expectedAccess: true },
      { key_menu: 'role', expectedAccess: true },
      { key_menu: 'menu', expectedAccess: true },
      { key_menu: 'nonexistent', expectedAccess: false },
    ];

    for (const testCase of testCases) {
      const response = await supertest(web)
        .get(`${baseUrlTest}?key_menu=${testCase.key_menu}`)
        .set('Cookie', cookieHeader ?? '');

      expect(response.status).toBe(200);
      expect(response.body.data.access).toBe(testCase.expectedAccess);
    }

    // ===== TEST 6: SUCCESS MESSAGE =====
    console.log('🧪 Testing success message...');

    const successResponse = await supertest(web)
      .get(`${baseUrlTest}?key_menu=user`)
      .set('Cookie', cookieHeader ?? '');
    expect(successResponse.status).toBe(200);
    expect(successResponse.body.message).toBe('Success to get permission.');
    expect(successResponse.body.data).toBeDefined();

    console.log('✅ All permission flow tests completed successfully');
  });
});
