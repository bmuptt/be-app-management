import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Detail User Business Flow', () => {
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

  it('Should handle complete detail user flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL USER DETAIL BY ID =====
    console.log('🧪 Testing successful user detail by ID...');

    const response = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.data).toBeDefined();
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.email).toBeDefined();
    expect(response.body.data.name).toBeDefined();
    expect(response.body.data.gender).toBeDefined();
    expect(response.body.data.birthdate).toBeDefined();
    expect(response.body.data.active).toBeDefined();
    expect(response.body.data.role_id).toBeDefined();
    expect(response.body.data.created_at).toBeDefined();
    expect(response.body.data.updated_at).toBeDefined();
    expect(response.body.data.created_by).toBeDefined();
    expect(response.body.data.updated_by).toBeDefined();
    expect(response.body.data.photo).toBeDefined();

    // ===== TEST 2: NON-EXISTENT USER ID =====
    console.log('🧪 Testing non-existent user ID...');

    const nonExistentResponse = await supertest(web)
      .get(`${baseUrlTest}/999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain(
      'The user does not exist!',
    );

    // ===== TEST 3: INVALID USER ID FORMAT =====
    console.log('🧪 Testing invalid user ID format...');

    const invalidFormatResponse = await supertest(web)
      .get(`${baseUrlTest}/invalid`)
      .set('Cookie', cookieHeader ?? '');

    expect(invalidFormatResponse.status).toBe(500);
    // The error message will be from Prisma about invalid ID format

    // ===== TEST 4: INCLUDE ROLE INFORMATION =====
    console.log('🧪 Testing include role information...');

    const roleResponse = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(roleResponse.status).toBe(200);
    expect(roleResponse.body.data).toBeDefined();
    expect(roleResponse.body.data.role).toBeDefined();
    expect(roleResponse.body.data.role.id).toBeDefined();
    expect(roleResponse.body.data.role.name).toBeDefined();

    // ===== TEST 5: ZERO USER ID =====
    console.log('🧪 Testing zero user ID...');

    const zeroResponse = await supertest(web)
      .get(`${baseUrlTest}/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 6: NEGATIVE USER ID =====
    console.log('🧪 Testing negative user ID...');

    const negativeResponse = await supertest(web)
      .get(`${baseUrlTest}/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 7: VERY LARGE USER ID =====
    console.log('🧪 Testing very large user ID...');

    const largeResponse = await supertest(web)
      .get(`${baseUrlTest}/999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeResponse.status).toBe(404);
    expect(largeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 8: CORRECT USER DATA FOR ADMIN USER =====
    console.log('🧪 Testing correct user data for admin user...');

    const adminResponse = await supertest(web)
      .get(`${baseUrlTest}/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(adminResponse.status).toBe(200);
    expect(adminResponse.body.data).toBeDefined();
    expect(adminResponse.body.data.id).toBe(1);
    expect(adminResponse.body.data.email).toBe(
      process.env.EMAIL_ADMIN || 'admin@gmail.com',
    );
    expect(adminResponse.body.data.name).toBe('Admin');

    console.log('✅ All detail user flow tests completed successfully');
  });
});
