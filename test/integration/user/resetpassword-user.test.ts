import dotenv from 'dotenv';
import { TestHelper, AuthLogic } from '../../test-util';
import supertest from 'supertest';
import { web } from '../../../src/config/web';
import { logger } from '../../../src/config/logging';

dotenv.config();

const baseUrlTest = '/api/app-management/user';

describe('Reset Password User Business Flow', () => {
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

  it('Should handle complete reset password user flow including validation, edge cases, and response structure', async () => {
    // Increase timeout for this comprehensive test
    jest.setTimeout(30000);

    // ===== TEST 1: SUCCESSFUL RESET PASSWORD FOR EXISTING USER =====
    console.log('🧪 Testing successful reset password for existing user...');

    // Test with seeded admin user (ID: 1)
    const response = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Success to reset password user.');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.active).toBe('Inactive');
    expect(response.body.data.id).toBe(1);
    expect(response.body.data.updated_by).toBe(1);

    // ===== TEST 2: NON-EXISTENT USER ID =====
    console.log('🧪 Testing non-existent user ID...');

    const nonExistentResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/999`)
      .set('Cookie', cookieHeader ?? '');

    expect(nonExistentResponse.status).toBe(404);
    expect(nonExistentResponse.body.errors).toContain(
      'The user does not exist!',
    );

    // ===== TEST 3: INVALID USER ID FORMAT =====
    console.log('🧪 Testing invalid user ID format...');

    const invalidFormatResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/invalid`)
      .set('Cookie', cookieHeader ?? '');

    // Invalid ID format causes a 500 error due to NaN being passed to database
    expect(invalidFormatResponse.status).toBe(500);

    // ===== TEST 4: ZERO USER ID =====
    console.log('🧪 Testing zero user ID...');

    const zeroResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/0`)
      .set('Cookie', cookieHeader ?? '');

    expect(zeroResponse.status).toBe(404);
    expect(zeroResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 5: NEGATIVE USER ID =====
    console.log('🧪 Testing negative user ID...');

    const negativeResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/-1`)
      .set('Cookie', cookieHeader ?? '');

    expect(negativeResponse.status).toBe(404);
    expect(negativeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 6: VERY LARGE USER ID =====
    console.log('🧪 Testing very large user ID...');

    const largeResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/999999999`)
      .set('Cookie', cookieHeader ?? '');

    expect(largeResponse.status).toBe(404);
    expect(largeResponse.body.errors).toContain('The user does not exist!');

    // ===== TEST 7: MULTIPLE RESET PASSWORD REQUESTS FOR SAME USER =====
    console.log('🧪 Testing multiple reset password requests for same user...');

    // First reset
    const response1 = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(response1.status).toBe(200);
    expect(response1.body.data.active).toBe('Inactive');

    // Second reset (should still work)
    const response2 = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(response2.status).toBe(200);
    expect(response2.body.data.active).toBe('Inactive');

    // ===== TEST 8: RESPONSE STRUCTURE =====
    console.log('🧪 Testing response structure...');

    const structureResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(structureResponse.status).toBe(200);
    expect(structureResponse.body).toHaveProperty('message');
    expect(structureResponse.body).toHaveProperty('data');
    expect(structureResponse.body.message).toBe(
      'Success to reset password user.',
    );
    expect(structureResponse.body.data).toHaveProperty('id');
    expect(structureResponse.body.data).toHaveProperty('active');
    expect(structureResponse.body.data).toHaveProperty('updated_by');
    expect(structureResponse.body.data.id).toBe(1);
    expect(structureResponse.body.data.active).toBe('Inactive');
    expect(structureResponse.body.data.updated_by).toBe(1);

    // ===== TEST 9: UPDATE THE UPDATED_BY FIELD CORRECTLY =====
    console.log('🧪 Testing update the updated_by field correctly...');

    const updatedByResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/1`)
      .set('Cookie', cookieHeader ?? '');

    expect(updatedByResponse.status).toBe(200);
    expect(updatedByResponse.body.data.updated_by).toBe(1); // Should be the user ID being reset

    // ===== TEST 10: RESET PASSWORD FOR NEWLY CREATED USER =====
    console.log('🧪 Testing reset password for newly created user...');

    // First create a new user
    const createResponse = await supertest(web)
      .post(baseUrlTest)
      .set('Cookie', cookieHeader ?? '')
      .send({
        email: 'newuser@example.com',
        name: 'New User',
        gender: 'Male',
        birthdate: '1990-01-01',
        role_id: 1,
      });

    expect(createResponse.status).toBe(200);
    const newUserId = createResponse.body.data.id;

    // Then reset password for the new user
    const newUserResetResponse = await supertest(web)
      .post(`${baseUrlTest}/reset-password/${newUserId}`)
      .set('Cookie', cookieHeader ?? '');

    expect(newUserResetResponse.status).toBe(200);
    expect(newUserResetResponse.body.data.active).toBe('Inactive');
    expect(newUserResetResponse.body.data.id).toBe(newUserId);
    expect(newUserResetResponse.body.data.updated_by).toBe(newUserId);

    console.log('✅ All reset password user flow tests completed successfully');
  });
});
